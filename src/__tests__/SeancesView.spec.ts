import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  administrateur,
  monter,
  salleDeTest,
  seanceDeTest,
  simulerSessionOuverte,
} from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { useGestionSeancesStore } from '@/stores/gestionSeances'
import type { Seance } from '@/types/seance'
import SeancesView from '@/views/administration/SeancesView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

const salles = {
  data: [salleDeTest(), salleDeTest({ id: 9, nom: 'Salle 9' })],
  meta: { total_places: 360 },
}

/** Simule l'API: les salles, puis les séances du jour demandé. */
function simulerListe(...listes: Seance[][]) {
  const reponses = [...listes]
  vi.mocked(api.get).mockImplementation(async (chemin: string) => {
    if (chemin === '/admin/salles') {
      return salles
    }
    return { data: reponses.length > 1 ? reponses.shift() : reponses[0] }
  })
}

async function monterLeJour(jour = '2026-11-20') {
  simulerSessionOuverte(administrateur)
  const resultat = await monter(SeancesView, '/admin/seances', {}, () => {
    useGestionSeancesStore().jour = jour
  })
  return resultat
}

describe('page des séances', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les séances du jour avec leur horaire, leurs tarifs, leur état et leurs places', async () => {
    simulerListe([
      seanceDeTest({
        places_vendues: 13,
        remplissage: { en_ligne: 10, guichet: 2, en_attente: 1, taux: 7 },
      }),
    ])
    const { page } = await monterLeJour()

    expect(api.get).toHaveBeenCalledWith('/admin/seances?date=2026-11-20')
    expect(page.find('caption').text()).toBe('Séances du vendredi 20 novembre 2026')
    const ligne = page.find('tbody tr')
    expect(ligne.find('th').text()).toBe('20:30 – 22:22')
    expect(ligne.text()).toContain('Le Souffle du Festival')
    expect(ligne.text()).toContain('VO')
    expect(ligne.text()).toMatch(/Plein 9,50\s€/)
    expect(ligne.text()).toContain('Publiée')
    const remplissage = ligne.find('.remplissage-seance')
    expect(remplissage.find('meter').attributes('value')).toBe('7')
    expect(remplissage.text()).toContain('7 %')
    expect(remplissage.text()).toContain('12 / 180 places')
    expect(remplissage.text()).toContain('10 en ligne · 2 au guichet')
    expect(remplissage.text()).toContain('1 en cours de paiement')
  })

  it('résume le remplissage des séances publiées du jour', async () => {
    simulerListe([
      seanceDeTest({ remplissage: { en_ligne: 50, guichet: 22, en_attente: 0, taux: 40 } }),
      seanceDeTest({
        id: 2,
        salle: { id: 1, nom: 'Salle 1', type: 'premium_imax', capacite: 1000 },
        remplissage: { en_ligne: 900, guichet: 35, en_attente: 0, taux: 94 },
      }),
      seanceDeTest({ id: 3, statut: 'brouillon' }),
    ])
    const { page } = await monterLeJour()

    expect(page.find('.bilan-remplissage').text()).toBe(
      'Remplissage des séances publiées: 85 % (1 007 places vendues sur 1 180).',
    )
    expect(page.find('.remplissage-seance').text()).not.toContain('en cours de paiement')
  })

  it('actualiser relit les chiffres après une vente', async () => {
    simulerListe(
      [seanceDeTest()],
      [seanceDeTest({ remplissage: { en_ligne: 0, guichet: 18, en_attente: 0, taux: 10 } })],
    )
    const { page } = await monterLeJour()
    expect(page.find('.remplissage-seance__taux').text()).toBe('0 %')

    const actualiser = page.findAll('.filtres__jours button').find((b) => b.text() === 'Actualiser')
    await actualiser?.trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-11-20')
    expect(page.find('.remplissage-seance__taux').text()).toBe('10 %')
    expect(page.find('.bilan-remplissage').text()).toContain('10 %')
  })

  it('une séance dont des places sont vendues ne propose plus la modification', async () => {
    simulerListe([seanceDeTest({ places_vendues: 1 }), seanceDeTest({ id: 2, places_vendues: 0 })])
    const { page } = await monterLeJour()

    const lignes = page.findAll('tbody tr')
    expect(lignes[0]?.find('a').exists()).toBe(false)
    expect(lignes[1]?.find('a').attributes('href')).toBe('/admin/seances/2/modifier')
  })

  it('publie un brouillon', async () => {
    simulerListe([seanceDeTest({ statut: 'brouillon' })], [seanceDeTest()])
    vi.mocked(api.post).mockResolvedValue({ data: seanceDeTest() })
    const { page } = await monterLeJour()
    expect(page.find('tbody').text()).toContain('Brouillon')

    await page.find('button[aria-label="Publier Le Souffle du Festival à 20:30"]').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/seances/1/publier')
    expect(page.find('[role="status"]').text()).toContain('publiée sur le site')
    expect(page.find('tbody').text()).toContain('Publiée')
  })

  it('refuse de dépublier une séance dont des places sont vendues, avec le message de l API', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    simulerListe([seanceDeTest({ places_vendues: 3 })])
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi(
        'Des places sont déjà vendues pour cette séance : elle ne peut pas être dépubliée.',
        409,
      ),
    )
    const { page } = await monterLeJour()

    await page
      .find('button[aria-label="Dépublier Le Souffle du Festival à 20:30"]')
      .trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(page.find('[role="alert"]').text()).toBe(
      'Des places sont déjà vendues pour cette séance : elle ne peut pas être dépubliée.',
    )
    expect(page.find('tbody').text()).toContain('Publiée')
  })

  it('supprime un brouillon après confirmation, et rien si l administrateur annule', async () => {
    const confirmation = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    simulerListe([seanceDeTest({ statut: 'brouillon' })], [])
    vi.mocked(api.delete).mockResolvedValue(undefined)
    const { page } = await monterLeJour()
    const bouton = page.find('button[aria-label="Supprimer Le Souffle du Festival à 20:30"]')

    await bouton.trigger('click')
    await flushPromises()
    expect(api.delete).not.toHaveBeenCalled()

    await bouton.trigger('click')
    await flushPromises()
    expect(confirmation).toHaveBeenCalledTimes(2)
    expect(api.delete).toHaveBeenCalledWith('/admin/seances/1')
    expect(page.text()).toContain('Aucune séance programmée le vendredi 20 novembre 2026.')
  })

  it('change de jour et filtre par salle', async () => {
    simulerListe([])
    const { page } = await monterLeJour()

    const suivant = page.findAll('.filtres__jours button')[1]
    await suivant?.trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-11-21')

    await page.find('#seances-jour').setValue('2026-12-24')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-12-24')

    expect(page.findAll('#seances-salle option').map((option) => option.text())).toEqual([
      'Toutes les salles',
      'Salle 3',
      'Salle 9',
    ])
    await page.find('#seances-salle').setValue('9')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-12-24&salle_id=9')

    await page.find('#seances-salle').setValue('')
    await flushPromises()
    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-12-24')
  })

  it('une session expirée renvoie vers la connexion', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Authentification requise.', 401))
    const { router } = await monterLeJour()

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
    expect(router.currentRoute.value.query.redirection).toBe('/admin/seances')
  })
})

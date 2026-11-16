import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  administrateur,
  filmDeTest,
  monter,
  pageDeFilms,
  salleDeTest,
  seanceDeTest,
  simulerSessionOuverte,
} from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { useGestionSeancesStore } from '@/stores/gestionSeances'
import type { Seance } from '@/types/seance'
import SeanceFormulaireView from '@/views/administration/SeanceFormulaireView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

/** Simule l'API: films à l'affiche, salles, et la séance à modifier s'il y en a une. */
function simulerApi(seance?: Seance) {
  vi.mocked(api.get).mockImplementation(async (chemin: string) => {
    if (chemin.startsWith('/admin/films')) {
      return pageDeFilms([filmDeTest(), filmDeTest({ id: 2, titre: 'Brume' })])
    }
    if (chemin === '/admin/salles') {
      return {
        data: [salleDeTest(), salleDeTest({ id: 9, nom: 'Salle 9' })],
        meta: { total_places: 360 },
      }
    }
    if (seance) {
      return { data: seance }
    }
    throw new ErreurApi('Ressource introuvable.', 404)
  })
}

describe('formulaire de séance', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(administrateur)
  })

  it('l administrateur programme une séance, enregistrée en brouillon', async () => {
    simulerApi()
    vi.mocked(api.post).mockResolvedValue({
      data: seanceDeTest({ statut: 'brouillon', debut: '2026-11-21T14:00:00+01:00' }),
    })
    const { page, router } = await monter(SeanceFormulaireView, '/admin/seances/nouvelle')
    expect(page.find('h1').text()).toBe('Programmer une séance')
    expect(page.findAll('#seance-film option').map((option) => option.text())).toEqual([
      'Choisir…',
      'Le Souffle du Festival',
      'Brume',
    ])

    await page.find('#seance-film').setValue('2')
    await page.find('#seance-salle').setValue('9')
    await page.find('#seance-date').setValue('2026-11-21')
    await page.find('#seance-heure').setValue('14:00')
    await page.find('#seance-langue').setValue('vf')
    await page.find('#seance-tarif-1-prix').setValue('6,5')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/seances', {
      film_id: 2,
      salle_id: 9,
      debut: '2026-11-21T14:00',
      langue: 'vf',
      tarifs: [
        { libelle: 'Plein', prix_centimes: 950 },
        { libelle: 'Réduit', prix_centimes: 650 },
        { libelle: 'Enfant', prix_centimes: 550 },
      ],
    })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('admin-seances'))
    const gestion = useGestionSeancesStore()
    expect(gestion.jour).toBe('2026-11-21')
    expect(gestion.annonce).toContain('enregistrée en brouillon')
  })

  it('les tarifs se retirent et s ajoutent, sans descendre sous un tarif', async () => {
    simulerApi()
    const { page } = await monter(SeanceFormulaireView, '/admin/seances/nouvelle')

    await page.find('button[aria-label="Retirer le tarif 3"]').trigger('click')
    await page.find('button[aria-label="Retirer le tarif 2"]').trigger('click')
    expect(page.findAll('.tarifs__ligne')).toHaveLength(1)
    expect(
      page.find('button[aria-label="Retirer le tarif 1"]').attributes('disabled'),
    ).toBeDefined()

    const ajouter = page.findAll('button').find((bouton) => bouton.text() === 'Ajouter un tarif')
    await ajouter?.trigger('click')
    expect(page.findAll('.tarifs__ligne')).toHaveLength(2)
    expect(page.find<HTMLInputElement>('#seance-tarif-1-libelle').element.value).toBe('')
  })

  it('les erreurs de l API s affichent sous chaque champ, y compris sous un tarif', async () => {
    simulerApi()
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Données invalides.', 422, {
        film_id: ['Le champ film est obligatoire.'],
        debut: ['Indiquez la date et l’heure de la séance.'],
        'tarifs.1.libelle': ['Deux tarifs ne peuvent pas avoir le même libellé.'],
        'tarifs.2.prix_centimes': ['Le champ prix du tarif est obligatoire.'],
      }),
    )
    const { page, router } = await monter(SeanceFormulaireView, '/admin/seances/nouvelle')

    await page.find('#seance-tarif-2-prix').setValue('')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith(
      '/admin/seances',
      expect.objectContaining({ film_id: null, salle_id: null, debut: '' }),
    )
    expect(page.find('#seance-film-erreur').text()).toBe('Le champ film est obligatoire.')
    expect(page.find('#seance-date-erreur').text()).toBe(
      'Indiquez la date et l’heure de la séance.',
    )
    expect(page.find('#seance-tarif-1-libelle-erreur').text()).toBe(
      'Deux tarifs ne peuvent pas avoir le même libellé.',
    )
    expect(page.find('#seance-tarif-2-prix').attributes('aria-invalid')).toBe('true')
    expect(router.currentRoute.value.name).toBe('admin-seance-nouvelle')
  })

  it('l administrateur modifie une séance existante', async () => {
    const seance = seanceDeTest({ id: 4, statut: 'brouillon', langue: 'vf' })
    simulerApi(seance)
    vi.mocked(api.put).mockResolvedValue({ data: seance })
    const { page, router } = await monter(SeanceFormulaireView, '/admin/seances/4/modifier', {
      id: 4,
    })

    expect(page.find('h1').text()).toBe('Modifier une séance')
    expect(page.find<HTMLSelectElement>('#seance-film').element.value).toBe('1')
    expect(page.find<HTMLInputElement>('#seance-date').element.value).toBe('2026-11-20')
    expect(page.find<HTMLInputElement>('#seance-heure').element.value).toBe('20:30')
    expect(page.find<HTMLInputElement>('#seance-tarif-0-prix').element.value).toBe('9,50')

    await page.find('#seance-heure').setValue('21:00')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith(
      '/admin/seances/4',
      expect.objectContaining({ film_id: 1, salle_id: 3, debut: '2026-11-20T21:00', langue: 'vf' }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('admin-seances'))
  })

  it('le film archivé d une séance reste proposé pour cette séance', async () => {
    const seance = seanceDeTest({
      statut: 'brouillon',
      film: { id: 8, titre: 'Crépuscule', duree_minutes: 95, archive: true },
    })
    simulerApi(seance)
    const { page } = await monter(SeanceFormulaireView, '/admin/seances/1/modifier', { id: 1 })

    expect(page.find<HTMLSelectElement>('#seance-film').element.value).toBe('8')
    expect(page.find('#seance-film').text()).toContain('Crépuscule')
  })

  it('une séance dont des places sont vendues ne peut plus être modifiée', async () => {
    simulerApi(seanceDeTest({ places_vendues: 2 }))
    const { page } = await monter(SeanceFormulaireView, '/admin/seances/1/modifier', { id: 1 })

    expect(page.find('[role="alert"]').text()).toContain('Des places sont déjà vendues')
    expect(page.find('form').exists()).toBe(false)
  })

  it('une séance inconnue est signalée avec un lien vers la liste', async () => {
    simulerApi()
    const { page } = await monter(SeanceFormulaireView, '/admin/seances/99/modifier', { id: 99 })

    const alerte = page.find('[role="alert"]')
    expect(alerte.text()).toContain('Cette séance n’existe pas.')
    expect(alerte.find('a').attributes('href')).toBe('/admin/seances')
  })

  it('une session expirée renvoie vers la connexion', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Authentification requise.', 401))
    const { router } = await monter(SeanceFormulaireView, '/admin/seances/nouvelle')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
  })
})

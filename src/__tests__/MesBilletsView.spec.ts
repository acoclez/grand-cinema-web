import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agent, billetDeTest, monter, simulerSessionOuverte, texte } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { enregistrerFichier } from '@/services/navigation'
import MesBilletsView from '@/views/MesBilletsView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))
vi.mock('@/services/navigation', () => ({
  enregistrerFichier: vi.fn<(contenu: Blob, nom: string) => void>(),
  ouvrirPageExterne: vi.fn<(url: string) => void>(),
}))

/** Deux billets pour la réservation 7 (B1 Plein, B2 Réduit), un pour la réservation 8. */
function billetsDeTest() {
  return [
    billetDeTest(),
    billetDeTest({
      id: 32,
      place: { rangee: 'B', numero: 2, pmr: true },
      tarif: 'Réduit',
      prix_centimes: 700,
      qr_code: 'data:image/svg+xml;base64,PHN2ZyBpZD0iMzIiLz4=',
    }),
    billetDeTest({
      id: 40,
      reservation: { id: 8, numero: 'R-QWERTY23' },
      seance: {
        id: 4,
        film: { id: 2, titre: 'Aurore' },
        salle: { nom: 'Salle 2' },
        debut: '2026-11-14T18:00:00+01:00',
        langue: 'vf',
      },
      place: { rangee: 'C', numero: 5, pmr: false },
      utilise_at: '2026-11-14T17:50:00+01:00',
    }),
  ]
}

async function monterMesBillets() {
  vi.mocked(api.get).mockResolvedValue({ data: billetsDeTest() })
  return monter(MesBilletsView, '/mes-billets')
}

describe('mes billets', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte()
  })

  it('le spectateur retrouve les billets de ses séances à venir, par réservation', async () => {
    const { page } = await monterMesBillets()

    expect(api.get).toHaveBeenCalledWith('/billets')
    const reservations = page.findAll('section.billets')
    expect(reservations.map((section) => section.find('h2').text())).toEqual([
      'Le Souffle du Festival',
      'Aurore',
    ])
    expect(texte(reservations[0]!.find('.billets__seance'))).toBe(
      'jeudi 12 novembre 2026 à 20:30, Salle 9, VO · Réservation R-7KX4M2PA',
    )
    const billets = reservations[0]!.findAll('.billet')
    expect(billets.map((billet) => texte(billet.find('.billet__place')))).toEqual([
      'Place B1',
      'Place B2 (PMR)',
    ])
    expect(texte(billets[1]!)).toContain('Réduit · 7,00 €')
  })

  it('chaque billet montre son QR code, à présenter à l entrée', async () => {
    const { page } = await monterMesBillets()

    const qr = page.findAll('img.billet__qr')
    expect(qr.map((image) => image.attributes('src'))).toEqual([
      'data:image/svg+xml;base64,PHN2Zy8+',
      'data:image/svg+xml;base64,PHN2ZyBpZD0iMzIiLz4=',
      'data:image/svg+xml;base64,PHN2Zy8+',
    ])
    expect(qr[0]!.attributes('alt')).toBe('QR code du billet de la place B1')
    expect(page.findAll('.billet__utilise').map((element) => element.text())).toEqual([
      'Déjà utilisé',
    ])
  })

  it('un billet se télécharge en PDF sous le nom du billet envoyé par e-mail', async () => {
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
    vi.mocked(api.telecharger).mockResolvedValue(pdf)
    const { page } = await monterMesBillets()

    const bouton = page.findAll('.billet button')[1]!
    expect(bouton.text()).toBe('Télécharger le billet B2 (PDF)')
    await bouton.trigger('click')
    await flushPromises()

    expect(api.telecharger).toHaveBeenCalledWith('/billets/32/pdf')
    expect(enregistrerFichier).toHaveBeenCalledWith(pdf, 'billet-R-7KX4M2PA-B2.pdf')
    expect(
      page.findAll('.billet button').every((b) => b.attributes('disabled') === undefined),
    ).toBe(true)
  })

  it('un téléchargement refusé affiche le message de l API', async () => {
    vi.mocked(api.telecharger).mockRejectedValue(new ErreurApi('Ce billet est introuvable.', 404))
    const { page } = await monterMesBillets()

    await page.find('.billet button').trigger('click')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe('Ce billet est introuvable.')
    expect(enregistrerFichier).not.toHaveBeenCalled()
  })

  it('sans billet à venir, la page propose de voir les séances', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const { page } = await monter(MesBilletsView, '/mes-billets')

    expect(page.find('.message').text()).toContain(
      'Vous n’avez aucun billet pour une séance à venir.',
    )
    expect(page.find('.message a').attributes('href')).toBe('/seances')
  })

  it('une session expirée renvoie vers la connexion', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Non authentifié.', 401))
    const { router } = await monter(MesBilletsView, '/mes-billets')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
    expect(router.currentRoute.value.query.redirection).toBe('/mes-billets')
  })

  it('la page est réservée aux spectateurs', async () => {
    simulerSessionOuverte(agent)
    const { router } = await monter(MesBilletsView, '/mes-billets')

    expect(router.currentRoute.value.name).toBe('accueil')
  })
})

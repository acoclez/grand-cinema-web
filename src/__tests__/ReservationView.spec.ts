import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { monter, reservationDeTest, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { ouvrirPageExterne } from '@/services/navigation'
import ReservationView from '@/views/ReservationView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))
vi.mock('@/services/navigation', () => ({ ouvrirPageExterne: vi.fn<(url: string) => void>() }))

/** Texte d'un élément, espaces insécables remplacées: Intl en met une avant « € ». */
function texte(element: { text: () => string }): string {
  return element.text().replace(/[  ]/g, ' ')
}

async function monterLaReservation(retour = '') {
  return monter(ReservationView, `/reservations/7${retour}`, { id: 7 })
}

/** Réservation 7 payée: B1 au tarif plein, B2 au tarif réduit. */
function reservationPayee() {
  return reservationDeTest({
    statut: 'confirmee',
    paiement: 'accepte',
    montant_centimes: 1650,
    expire_at: null,
    secondes_restantes: 0,
    places: [
      { id: 21, rangee: 'B', numero: 1, pmr: false, tarif: 'Plein', prix_centimes: 950 },
      { id: 22, rangee: 'B', numero: 2, pmr: false, tarif: 'Réduit', prix_centimes: 700 },
    ],
  })
}

describe('réservation en cours', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    // Les tests se déroulent le jeudi 12 novembre 2026 à 10 h.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10, 0))
    simulerSessionOuverte()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('récapitule la séance et les places, avec le temps restant avant leur libération', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: reservationDeTest({ secondes_restantes: 125 }) })
    const { page } = await monterLaReservation()

    expect(api.get).toHaveBeenCalledWith('/reservations/7')
    expect(page.find('.reservation__numero').text()).toBe('R-7KX4M2PA')
    expect(page.find('.profil').text()).toContain('jeudi 12 novembre 2026 à 20:30, Salle 9, VO')
    expect(page.find('.reservation__places').text()).toBe('B1, B2 (2 places)')
    expect(page.find('.compte-a-rebours strong').text()).toBe('2:05')

    await vi.advanceTimersByTimeAsync(5000)
    expect(page.find('.compte-a-rebours strong').text()).toBe('2:00')
  })

  it('à la fin des 10 minutes, les places sont annoncées libérées', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: reservationDeTest({ secondes_restantes: 3 }) })
    const { page } = await monterLaReservation()

    await vi.advanceTimersByTimeAsync(3000)

    expect(page.find('.compte-a-rebours').exists()).toBe(false)
    expect(page.find('.reservation__fin').text()).toBe(
      'Le délai de 10 minutes est dépassé: vos places ont été libérées.',
    )
    expect(page.find('a.bouton').attributes('href')).toBe('/seances/1/places')
  })

  it('le spectateur abandonne sa réservation et libère ses places', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: reservationDeTest() })
    vi.mocked(api.delete).mockResolvedValue(undefined)
    const { page } = await monterLaReservation()

    const abandonner = page
      .findAll('.actions button')
      .find((b) => b.text() === 'Abandonner la réservation')
    await abandonner?.trigger('click')
    await flushPromises()

    expect(api.delete).toHaveBeenCalledWith('/reservations/7')
    expect(page.find('.reservation__fin').text()).toBe(
      'Vous avez abandonné cette réservation: ses places sont libérées.',
    )
  })

  it('modifier ses places rouvre le plan avec la sélection précédente', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: reservationDeTest() })
    vi.mocked(api.delete).mockResolvedValue(undefined)
    const { page, router } = await monterLaReservation()

    const modifier = page.findAll('.actions button').find((b) => b.text() === 'Modifier mes places')
    await modifier?.trigger('click')
    await flushPromises()

    expect(api.delete).toHaveBeenCalledWith('/reservations/7')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/seances/1/places'))
    expect(page.vm.$pinia.state.value.reservation?.selection).toEqual([21, 22])
  })

  it('une réservation introuvable ou d un autre compte affiche un message', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Ressource introuvable.', 404))
    const { page } = await monterLaReservation()

    expect(page.find('[role="alert"]').text()).toBe('Cette réservation est introuvable.')
  })

  it('une réservation confirmée n affiche plus de compte à rebours', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: reservationDeTest({ statut: 'confirmee', expire_at: null, secondes_restantes: 0 }),
    })
    const { page } = await monterLaReservation()

    expect(page.find('.message--succes').text()).toBe('Votre réservation est confirmée.')
    expect(page.find('.actions').exists()).toBe(false)
  })

  it('le spectateur choisit un tarif par place, voit le total puis part payer chez Stripe', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: reservationDeTest() })
    vi.mocked(api.post).mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/c/pay/cs_1' },
    })
    const { page } = await monterLaReservation()

    expect(page.findAll('.panier__place label').map((label) => label.text())).toEqual([
      'Place B1',
      'Place B2',
    ])
    expect(texte(page.find('.panier__total'))).toBe('Total: 19,00 €')
    await page.find('#tarif-22').setValue('6')
    expect(texte(page.find('.panier__total'))).toBe('Total: 16,50 €')

    const payer = page.find('.panier .bouton')
    expect(texte(payer)).toBe('Payer 16,50 €')
    await payer.trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/reservations/7/paiement', {
      billets: [
        { place_id: 21, tarif_id: 5 },
        { place_id: 22, tarif_id: 6 },
      ],
    })
    expect(ouvrirPageExterne).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_1')
  })

  it('au retour de Stripe, le paiement accepté confirme la réservation avec le détail payé', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: reservationPayee() })
    const { page } = await monterLaReservation('?paiement=termine')

    expect(api.post).toHaveBeenCalledWith('/reservations/7/paiement/verification')
    expect(api.get).not.toHaveBeenCalled()
    expect(page.find('.message--succes').text()).toBe('Votre réservation est confirmée.')
    expect(texte(page.find('.reservation__tarifs'))).toBe('B1 Plein 9,50 €, B2 Réduit 7,00 €')
    expect(texte(page.find('.reservation__montant'))).toBe('16,50 €')
    expect(page.find('.panier').exists()).toBe(false)
  })

  it('un paiement pas encore accepté se vérifie à nouveau', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: reservationDeTest({ paiement: 'en_attente' }) })
      .mockResolvedValueOnce({ data: reservationPayee() })
    const { page } = await monterLaReservation('?paiement=termine')

    expect(page.find('.paiement__retour').text()).toContain(
      'Votre paiement n’est pas encore accepté par Stripe.',
    )
    await page.find('.paiement__retour button').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledTimes(2)
    expect(page.find('.message--succes').text()).toBe('Votre réservation est confirmée.')
  })

  it('après un paiement abandonné, les places restent bloquées avec les tarifs déjà choisis', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: reservationDeTest({
        paiement: 'refuse',
        montant_centimes: 1400,
        places: [
          { id: 21, rangee: 'B', numero: 1, pmr: false, tarif: 'Réduit', prix_centimes: 700 },
          { id: 22, rangee: 'B', numero: 2, pmr: false, tarif: 'Réduit', prix_centimes: 700 },
        ],
      }),
    })
    const { page } = await monterLaReservation('?paiement=abandonne')

    expect(page.find('.paiement__retour').text()).toBe(
      'Paiement non effectué: vos places restent bloquées jusqu’à la fin du délai. Vous pouvez payer à nouveau.',
    )
    expect((page.find('#tarif-21').element as HTMLSelectElement).value).toBe('6')
    expect(texte(page.find('.panier__total'))).toBe('Total: 14,00 €')
  })

  it('un paiement refusé par l API affiche son message sans quitter la page', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: reservationDeTest() })
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Le délai de 10 minutes est dépassé: vos places ont été libérées.', 409),
    )
    const { page } = await monterLaReservation()

    await page.find('.panier .bouton').trigger('click')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Le délai de 10 minutes est dépassé: vos places ont été libérées.',
    )
    expect(ouvrirPageExterne).not.toHaveBeenCalled()
  })

  it('un paiement arrivé après la libération des places est annoncé remboursé', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: reservationDeTest({ statut: 'expiree', paiement: 'rembourse', secondes_restantes: 0 }),
    })
    const { page } = await monterLaReservation()

    expect(page.find('.reservation__fin').text()).toBe(
      'Le délai de 10 minutes est dépassé: vos places ont été libérées. Votre paiement, arrivé après leur libération, vous a été remboursé.',
    )
  })
})

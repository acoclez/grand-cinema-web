import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { monter, reservationDeTest, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import ReservationView from '@/views/ReservationView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

async function monterLaReservation() {
  return monter(ReservationView, '/reservations/7', { id: 7 })
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
})

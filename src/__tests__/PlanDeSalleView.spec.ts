import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  administrateur,
  monter,
  planDeTest,
  reservationDeTest,
  simulerSessionOuverte,
} from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { ACTUALISATION_PLAN_MS } from '@/stores/reservation'
import PlanDeSalleView from '@/views/PlanDeSalleView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

async function monterLePlan() {
  return monter(PlanDeSalleView, '/seances/1/places', { id: 1 })
}

describe('plan de salle', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    // Les tests se déroulent le jeudi 12 novembre 2026 à 10 h.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('distingue les places libres, occupées et réservées aux personnes à mobilité réduite', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const { page } = await monterLePlan()

    expect(api.get).toHaveBeenCalledWith('/seances/1/plan')
    expect(page.find('h1').text()).toBe('Le Souffle du Festival')
    expect(page.find('.plan-seance').text()).toBe(
      'jeudi 12 novembre 2026 à 20:30 · Salle 9 · Événementielle · VO',
    )
    expect(page.find('.plan-libres').text()).toBe('5 places libres sur 6')
    const rangees = page.findAll('.plan__rangee')
    expect(rangees.map((rangee) => rangee.find('.plan__nom-rangee').text())).toEqual(['A', 'B'])
    const [a1, a2, a3] = rangees[0]?.findAll('button') ?? []
    expect(a1?.attributes('aria-label')).toBe(
      'Place A1, libre, réservée aux personnes à mobilité réduite',
    )
    expect(a1?.classes()).toContain('place--pmr')
    expect(a2?.attributes('aria-label')).toBe('Place A2, occupée')
    expect(a2?.classes()).toContain('place--occupee')
    expect(a2?.attributes('disabled')).toBeDefined()
    expect(a3?.attributes('aria-label')).toBe('Place A3, libre')
    expect(a3?.attributes('disabled')).toBeUndefined()
    expect(page.find('.legende').text()).toContain('Réservée aux personnes à mobilité réduite')
  })

  it('le spectateur choisit ses places et les bloque pendant 10 minutes', async () => {
    simulerSessionOuverte()
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    vi.mocked(api.post).mockResolvedValue({ data: reservationDeTest() })
    const { page, router } = await monterLePlan()
    expect(page.find('.plan-consigne').text()).toBe(
      'Choisissez jusqu’à 10 places. Elles seront bloquées pour vous pendant 10 minutes, le temps de payer.',
    )
    const bouton = page.find('.selection .bouton')
    expect(page.find('.selection__resume').text()).toBe('Aucune place choisie.')
    expect(bouton.attributes('disabled')).toBeDefined()

    await page.find('[aria-label="Place B1, libre"]').trigger('click')
    await page.find('[aria-label="Place B2, libre"]').trigger('click')
    expect(page.find('.selection__resume').text()).toBe('2 places choisies: B1, B2')
    expect(page.find('[aria-label="Place B1, choisie"]').attributes('aria-pressed')).toBe('true')

    await bouton.trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/seances/1/reservations', { places: [21, 22] })
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/reservations/7'))
  })

  it('au-delà de 10 places, la place n est pas ajoutée et la limite est rappelée', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest({ places_max: 2 }) })
    const { page } = await monterLePlan()

    await page.find('[aria-label="Place B1, libre"]').trigger('click')
    await page.find('[aria-label="Place B2, libre"]').trigger('click')
    await page.find('[aria-label="Place B3, libre"]').trigger('click')

    expect(page.find('.selection__resume').text()).toBe('2 places choisies: B1, B2')
    expect(page.find('.plan-annonce').text()).toBe('Vous pouvez choisir 2 places au maximum.')
  })

  it('un visiteur choisit ses places, se connecte, puis les retrouve', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const { page, router } = await monterLePlan()

    await page.find('[aria-label="Place B3, libre"]').trigger('click')
    const bouton = page.find('.selection .bouton')
    expect(bouton.text()).toBe('Se connecter pour réserver')
    await bouton.trigger('click')
    await flushPromises()

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
    expect(router.currentRoute.value.query.redirection).toBe('/seances/1/places')
    expect(api.post).not.toHaveBeenCalled()
    // La sélection est gardée dans le store pendant la connexion.
    expect(page.vm.$pinia.state.value.reservation?.selection).toEqual([23])
  })

  it('si une place vient d etre prise, le message s affiche et le plan est relu', async () => {
    simulerSessionOuverte()
    const planApres = planDeTest()
    planApres.places = planApres.places.map((place) =>
      place.id === 21 ? { ...place, libre: false } : place,
    )
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: planDeTest() })
      .mockResolvedValueOnce({ data: planApres })
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Ces places viennent d’être prises: B1. Choisissez-en d’autres.', 409),
    )
    const { page, router } = await monterLePlan()

    await page.find('[aria-label="Place B1, libre"]').trigger('click')
    await page.find('[aria-label="Place B2, libre"]').trigger('click')
    await page.find('.selection .bouton').trigger('click')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Ces places viennent d’être prises: B1. Choisissez-en d’autres.',
    )
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(page.find('[aria-label="Place B1, occupée"]').exists()).toBe(true)
    expect(page.find('.selection__resume').text()).toBe('1 place choisie: B2')
    expect(router.currentRoute.value.fullPath).toBe('/seances/1/places')
  })

  it('le plan est relu toutes les 5 secondes et annonce une place choisie prise entre-temps', async () => {
    const planApres = planDeTest()
    planApres.places = planApres.places.map((place) =>
      place.id === 22 ? { ...place, libre: false } : place,
    )
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: planDeTest() })
      .mockResolvedValue({ data: planApres })
    const { page } = await monterLePlan()
    await page.find('[aria-label="Place B2, libre"]').trigger('click')

    await vi.advanceTimersByTimeAsync(ACTUALISATION_PLAN_MS - 1)
    expect(api.get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(api.get).toHaveBeenCalledTimes(2)
    expect(page.find('.plan-annonce').text()).toBe(
      'La place B2 vient d’être prise: choisissez-en une autre.',
    )
    expect(page.find('.selection__resume').text()).toBe('Aucune place choisie.')

    page.unmount()
    await vi.advanceTimersByTimeAsync(ACTUALISATION_PLAN_MS * 2)
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('une séance commencée se consulte sans réservation possible', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest({ reservable: false }) })
    const { page } = await monterLePlan()

    expect(page.find('.message--erreur').text()).toBe(
      'Cette séance a commencé: ses places ne se réservent plus.',
    )
    expect(page.find('[aria-label="Place B1, libre"]').attributes('disabled')).toBeDefined()
    expect(page.find('.selection').exists()).toBe(false)
  })

  it('le personnel consulte le plan sans réserver en ligne', async () => {
    simulerSessionOuverte(administrateur)
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const { page } = await monterLePlan()

    expect(page.find('.message').text()).toBe(
      'La réservation en ligne est réservée aux comptes spectateurs.',
    )
    expect(page.find('.selection').exists()).toBe(false)
  })

  it('une séance non proposée affiche un message', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Ressource introuvable.', 404))
    const { page } = await monterLePlan()

    expect(page.find('[role="alert"]').text()).toBe(
      'Cette séance n’est pas proposée à la réservation.',
    )
  })
})

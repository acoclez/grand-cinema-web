import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { planDeTest, reservationDeTest } from '@/__tests__/outils'
import { api } from '@/services/api'
import { useReservationStore } from '@/stores/reservation'
import type { PlanDeSalle } from '@/types/reservation'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

/** Le plan de test, avec les places indiquées occupées en plus de A2. */
function planAvecOccupees(...ids: number[]): PlanDeSalle {
  const plan = planDeTest()
  return {
    ...plan,
    places: plan.places.map((place) =>
      ids.includes(place.id) ? { ...place, libre: false } : place,
    ),
  }
}

describe('store reservation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('charge le plan d une séance', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const store = useReservationStore()

    expect(await store.chargerPlan(1)).toEqual([])

    expect(api.get).toHaveBeenCalledWith('/seances/1/plan')
    expect(store.plan?.places).toHaveLength(6)
  })

  it('choisit des places libres, dans la limite du plan, et les retire au second clic', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest({ places_max: 2 }) })
    const store = useReservationStore()
    await store.chargerPlan(1)
    const [a1, a2, a3, b1] = store.plan?.places ?? []

    store.basculer(a1!)
    store.basculer(a2!)
    store.basculer(a3!)
    store.basculer(b1!)
    expect(store.selection).toEqual([11, 13])
    expect(store.placesChoisies.map((place) => place.id)).toEqual([11, 13])

    store.basculer(a1!)
    expect(store.selection).toEqual([13])
  })

  it('retire de la sélection les places prises entre deux lectures du plan et les renvoie', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: planDeTest() })
    const store = useReservationStore()
    await store.chargerPlan(1)
    store.selection = [21, 22]

    vi.mocked(api.get).mockResolvedValueOnce({ data: planAvecOccupees(22) })
    const prises = await store.chargerPlan(1)

    expect(prises.map((place) => place.id)).toEqual([22])
    expect(store.selection).toEqual([21])
  })

  it('ouvrir le plan d une autre séance vide la sélection', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const store = useReservationStore()
    await store.chargerPlan(1)
    store.selection = [21]

    await store.chargerPlan(2)

    expect(store.selection).toEqual([])
  })

  it('bloque les places choisies, puis vide la sélection', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    vi.mocked(api.post).mockResolvedValue({ data: reservationDeTest() })
    const store = useReservationStore()
    await store.chargerPlan(1)
    store.selection = [21, 22]

    const reservation = await store.bloquer(1)

    expect(api.post).toHaveBeenCalledWith('/seances/1/reservations', { places: [21, 22] })
    expect(reservation.numero).toBe('R-7KX4M2PA')
    expect(store.reservation?.id).toBe(7)
    expect(store.selection).toEqual([])
  })

  it('modifier abandonne la réservation et remet ses places dans la sélection', async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined)
    const store = useReservationStore()
    store.reservation = reservationDeTest()

    const seance = await store.modifier(reservationDeTest())

    expect(api.delete).toHaveBeenCalledWith('/reservations/7')
    expect(seance).toBe(1)
    expect(store.selection).toEqual([21, 22])
    expect(store.reservation?.statut).toBe('annulee')

    // Le plan de la même séance garde ces places choisies.
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    await store.chargerPlan(1)
    expect(store.selection).toEqual([21, 22])
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { planAvecOccupees, planDeTest, reservationDeTest } from '@/__tests__/outils'
import { api } from '@/services/api'
import { useGuichetStore } from '@/stores/guichet'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

/** Vente encaissée au guichet: B1 au plein tarif et B2 au tarif réduit. */
const venteDeTest = reservationDeTest({
  id: 8,
  numero: 'R-GUICHET2',
  statut: 'confirmee',
  canal: 'guichet',
  montant_centimes: 1650,
  expire_at: null,
  secondes_restantes: 0,
  places: [
    { id: 21, rangee: 'B', numero: 1, pmr: false, tarif: 'Plein', prix_centimes: 950 },
    { id: 22, rangee: 'B', numero: 2, pmr: false, tarif: 'Réduit', prix_centimes: 700 },
  ],
})

describe('store guichet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('une place choisie part au premier tarif, le total suit les tarifs choisis', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const store = useGuichetStore()
    await store.chargerPlan(1)
    const [, a2, , b1, b2] = store.plan?.places ?? []

    store.basculer(b1!)
    store.basculer(b2!)
    store.basculer(a2!)
    expect(store.selection).toEqual([21, 22])
    expect(store.tarifs).toEqual({ 21: 5, 22: 5 })
    expect(store.total).toBe(1900)

    store.tarifs[22] = 6
    expect(store.total).toBe(1650)

    store.basculer(b1!)
    expect(store.selection).toEqual([22])
    expect(store.total).toBe(700)
  })

  it('encaisse la vente avec une place et un tarif par billet, puis repart de zéro', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    vi.mocked(api.post).mockResolvedValue({ data: venteDeTest })
    const store = useGuichetStore()
    await store.chargerPlan(1)
    store.selection = [21, 22]
    store.tarifs = { 21: 5, 22: 6 }

    const vente = await store.vendre(1)

    expect(api.post).toHaveBeenCalledWith('/guichet/seances/1/ventes', {
      billets: [
        { place_id: 21, tarif_id: 5 },
        { place_id: 22, tarif_id: 6 },
      ],
    })
    expect(vente.numero).toBe('R-GUICHET2')
    expect(store.derniereVente?.montant_centimes).toBe(1650)
    expect(store.selection).toEqual([])
    expect(store.tarifs).toEqual({})

    // Choisir la place suivante commence une nouvelle vente.
    store.basculer(store.plan!.places[2]!)
    expect(store.derniereVente).toBeNull()
  })

  it('une place prise en ligne entre deux lectures quitte la vente et est renvoyée', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: planDeTest() })
    const store = useGuichetStore()
    await store.chargerPlan(1)
    store.selection = [21, 22]

    vi.mocked(api.get).mockResolvedValueOnce({ data: planAvecOccupees(22) })
    const prises = await store.chargerPlan(1)

    expect(prises.map((place) => place.id)).toEqual([22])
    expect(store.selection).toEqual([21])
  })

  it('ouvrir le plan d une autre séance repart d une vente vide', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const store = useGuichetStore()
    await store.chargerPlan(1)
    store.selection = [21]
    store.tarifs = { 21: 6 }

    await store.chargerPlan(2)

    expect(store.selection).toEqual([])
    expect(store.tarifs).toEqual({})
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filmDeTest, seancePubliqueDeTest } from '@/__tests__/outils'
import { api } from '@/services/api'
import { useProgrammationStore } from '@/stores/programmation'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('store de la programmation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('charge les films à l affiche et la fiche d un film', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [filmDeTest()] })
      .mockResolvedValueOnce({ data: filmDeTest({ id: 4 }) })
    const programmation = useProgrammationStore()

    await programmation.chargerFilms()
    expect(api.get).toHaveBeenLastCalledWith('/films')
    expect(programmation.films).toHaveLength(1)

    await expect(programmation.chargerFilm(4)).resolves.toMatchObject({ id: 4 })
    expect(api.get).toHaveBeenLastCalledWith('/films/4')
  })

  it('charge les séances de la date choisie et les regroupe par film', async () => {
    const aurore = { ...seancePubliqueDeTest().film, id: 2, titre: 'Aurore' }
    vi.mocked(api.get).mockResolvedValue({
      data: [
        seancePubliqueDeTest({ id: 1, debut: '2026-11-12T14:00:00+01:00' }),
        seancePubliqueDeTest({ id: 2, film: aurore, debut: '2026-11-12T17:30:00+01:00' }),
        seancePubliqueDeTest({ id: 3, debut: '2026-11-12T20:30:00+01:00' }),
      ],
    })
    const programmation = useProgrammationStore()
    programmation.jour = '2026-11-12'

    await programmation.chargerSeances()

    expect(api.get).toHaveBeenCalledWith('/seances?date=2026-11-12')
    expect(programmation.seancesParFilm.map((groupe) => groupe.film.titre)).toEqual([
      'Aurore',
      'Le Souffle du Festival',
    ])
    expect(programmation.seancesParFilm[1]?.seances.map((seance) => seance.id)).toEqual([1, 3])
  })
})

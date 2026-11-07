import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filmDeTest } from '@/__tests__/outils'
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
})

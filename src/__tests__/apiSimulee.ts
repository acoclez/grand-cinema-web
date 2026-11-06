/**
 * Remplace le service api dans les tests en la simulant
 *
 * Utilisation en tête d'un fichier de test:
 * vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))
 */
import { vi } from 'vitest'

import type * as ModuleApi from '@/services/api'

const original = await vi.importActual<typeof ModuleApi>('@/services/api')

export const { ErreurApi, MESSAGE_ERREUR_INATTENDUE, MESSAGE_SERVEUR_INJOIGNABLE } = original

export const brancherAuthentification = vi.fn<typeof original.brancherAuthentification>(
  original.brancherAuthentification,
)

export const api = {
  get: vi.fn<typeof original.api.get>(),
  post: vi.fn<typeof original.api.post>(),
  put: vi.fn<typeof original.api.put>(),
}

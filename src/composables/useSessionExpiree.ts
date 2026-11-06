import { useRoute, useRouter } from 'vue-router'

import { ErreurApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

/**
 * Quand l'API refuse le jeton (session expirée ou fermée ailleurs), ferme la session
 * et renvoie vers la connexion, qui ramènera ensuite à la page en cours.
 */
export function useSessionExpiree() {
  const auth = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  /** Indique si l'erreur était un jeton refusé, auquel cas la redirection est faite. */
  async function rediriger(erreur: unknown): Promise<boolean> {
    if (!(erreur instanceof ErreurApi) || erreur.statut !== 401) {
      return false
    }
    auth.fermerSession()
    await router.push({ name: 'connexion', query: { redirection: route.fullPath } })
    return true
  }

  return { rediriger }
}

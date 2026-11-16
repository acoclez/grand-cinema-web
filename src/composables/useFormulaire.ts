import { ref } from 'vue'

import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'

/**
 * État commun aux formulaires: envoi en cours, message d'erreur général
 * et première erreur de chaque champ renvoyée par l'API (réponse 422).
 */
export function useFormulaire() {
  const envoiEnCours = ref(false)
  const erreurGenerale = ref<string | null>(null)
  const erreurs = ref<Record<string, string>>({})

  /** Exécute l'action et indique si elle a réussi. */
  async function envoyer(action: () => Promise<unknown>): Promise<boolean> {
    envoiEnCours.value = true
    erreurGenerale.value = null
    erreurs.value = {}
    try {
      await action()
      return true
    } catch (erreur) {
      if (erreur instanceof ErreurApi) {
        erreurs.value = Object.fromEntries(
          Object.entries(erreur.erreurs).map(([champ, messages]) => [champ, messages[0] ?? '']),
        )
        // Sur une réponse 422, les messages s'affichent sous chaque champ.
        if (erreur.statut !== 422) {
          erreurGenerale.value = erreur.message
        }
      } else {
        erreurGenerale.value = MESSAGE_ERREUR_INATTENDUE
      }
      return false
    } finally {
      envoiEnCours.value = false
    }
  }

  return { envoiEnCours, erreurGenerale, erreurs, envoyer }
}

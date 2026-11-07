import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useFormulaire } from '@/composables/useFormulaire'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'

interface OptionsEdition<T> {
  /** Message affiché quand l'élément à modifier n'existe pas (réponse 404). */
  introuvable: string
  /** Page de la liste, ouverte après un enregistrement réussi. */
  pageDeRetour: string
  creer: (donnees: T) => Promise<unknown>
  modifier: (id: number, donnees: T) => Promise<unknown>
}

/**
 * Formulaire de création et de modification du back-office (films, séances):
 * chargement de l'élément à modifier, puis enregistrement et retour à la liste.
 * Une session expirée renvoie vers la connexion, comme sur les autres pages.
 */
export function useEdition<T>(options: OptionsEdition<T>) {
  const router = useRouter()
  const { rediriger } = useSessionExpiree()
  const formulaire = useFormulaire()
  const chargement = ref(false)
  const erreurChargement = ref<string | null>(null)

  function messageDeChargement(erreur: unknown): string {
    if (!(erreur instanceof ErreurApi)) {
      return MESSAGE_ERREUR_INATTENDUE
    }
    return erreur.statut === 404 ? options.introuvable : erreur.message
  }

  /** Charge les données de la page et affiche l'erreur éventuelle à la place du formulaire. */
  async function charger(action: () => Promise<void>): Promise<void> {
    chargement.value = true
    erreurChargement.value = null
    try {
      await action()
    } catch (e) {
      if (await rediriger(e)) {
        return
      }
      erreurChargement.value = messageDeChargement(e)
    } finally {
      chargement.value = false
    }
  }

  /** Crée l'élément sans identifiant, le modifie avec, puis revient à la liste. */
  async function enregistrer(id: number | undefined, donnees: () => T): Promise<void> {
    const reussi = await formulaire.envoyer(() =>
      id === undefined ? options.creer(donnees()) : options.modifier(id, donnees()),
    )
    if (reussi) {
      await router.push({ name: options.pageDeRetour })
    }
  }

  return { ...formulaire, chargement, erreurChargement, charger, enregistrer }
}

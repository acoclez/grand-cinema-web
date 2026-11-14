import { onBeforeUnmount, onMounted, ref } from 'vue'

import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { libellePlace, type PlaceDuPlan } from '@/types/reservation'

/** Le plan est relu toutes les 5 secondes, pour voir les places prises par les autres. */
export const ACTUALISATION_PLAN_MS = 5000

/**
 * Plan de salle affiché sur le site comme au guichet: premier chargement, relecture toutes
 * les 5 secondes tant que la page est ouverte, et annonce des places choisies qui viennent
 * d'être prises ailleurs.
 *
 * @param charger Lit le plan et renvoie les places choisies prises entre-temps
 * @param oublierLePlan Efface le plan quand la séance n'est pas proposée
 */
export function usePlanDeSalle(charger: () => Promise<PlaceDuPlan[]>, oublierLePlan: () => void) {
  const chargement = ref(true)
  const erreur = ref<string | null>(null)
  /** Annonce lue par les lecteurs d'écran: place prise entre-temps, limite atteinte. */
  const annonce = ref<string | null>(null)
  let actualisation: ReturnType<typeof setInterval> | undefined

  function annoncerPrises(prises: PlaceDuPlan[]): void {
    if (prises.length === 1) {
      annonce.value = `La place ${libellePlace(prises[0]!)} vient d’être prise: choisissez-en une autre.`
    } else if (prises.length > 1) {
      annonce.value = `Les places ${prises.map(libellePlace).join(', ')} viennent d’être prises: choisissez-en d’autres.`
    }
  }

  async function actualiser(): Promise<void> {
    try {
      annoncerPrises(await charger())
    } catch {
      // Une relecture manquée n'efface pas le plan affiché: la suivante le remettra à jour.
    }
  }

  async function chargerPremiereFois(): Promise<void> {
    try {
      annoncerPrises(await charger())
    } catch (e) {
      oublierLePlan()
      if (e instanceof ErreurApi && e.statut === 404) {
        erreur.value = 'Cette séance n’est pas proposée à la réservation.'
      } else {
        erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
      }
    } finally {
      chargement.value = false
    }
  }

  onMounted(async () => {
    await chargerPremiereFois()
    actualisation = setInterval(actualiser, ACTUALISATION_PLAN_MS)
  })

  onBeforeUnmount(() => clearInterval(actualisation))

  return { chargement, erreur, annonce }
}

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api } from '@/services/api'
import { lirePlan, separerLesPlacesPrises } from '@/services/planDeSalle'
import type { Element } from '@/types/pagination'
import type { PlaceDuPlan, PlanDeSalle, Reservation } from '@/types/reservation'

/**
 * Vente au guichet (US-16): le plan de salle de la séance, le même que sur le site, les places
 * choisies pour le client avec leur tarif, puis la vente encaissée.
 */
export const useGuichetStore = defineStore('guichet', () => {
  const plan = ref<PlanDeSalle | null>(null)
  const selection = ref<number[]>([])
  /** Tarif choisi pour chaque place de la sélection, par identifiant de place. */
  const tarifs = ref<Record<number, number>>({})
  /** Séance de la vente en cours: ouvrir le plan d'une autre séance repart de zéro. */
  const seanceDeLaVente = ref<number | null>(null)
  /** Dernière vente encaissée, rappelée à l'agent jusqu'à la vente suivante. */
  const derniereVente = ref<Reservation | null>(null)

  const placesChoisies = computed<PlaceDuPlan[]>(
    () => plan.value?.places.filter((place) => selection.value.includes(place.id)) ?? [],
  )

  /** Prix du tarif choisi pour une place de la vente. */
  function prixDe(place: PlaceDuPlan): number {
    const tarif = plan.value?.tarifs.find((candidat) => candidat.id === tarifs.value[place.id])
    return tarif?.prix_centimes ?? 0
  }

  /** Montant à encaisser: le prix du tarif choisi pour chaque place. */
  const total = computed(() =>
    placesChoisies.value.reduce((somme, place) => somme + prixDe(place), 0),
  )

  /**
   * Charge ou relit le plan de la séance. Les places choisies qui viennent d'être prises en
   * ligne quittent la vente en cours: elles sont renvoyées pour l'annoncer.
   */
  async function chargerPlan(seanceId: number): Promise<PlaceDuPlan[]> {
    if (seanceDeLaVente.value !== seanceId) {
      selection.value = []
      tarifs.value = {}
      derniereVente.value = null
      seanceDeLaVente.value = seanceId
    }
    plan.value = await lirePlan(seanceId)
    const { prises, restantes } = separerLesPlacesPrises(plan.value, selection.value)
    selection.value = restantes
    return prises
  }

  /** Ajoute une place libre à la vente, au premier tarif de la séance, ou la retire. */
  function basculer(place: PlaceDuPlan): void {
    if (selection.value.includes(place.id)) {
      selection.value = selection.value.filter((id) => id !== place.id)
      return
    }
    const premierTarif = plan.value?.tarifs[0]
    if (place.libre && premierTarif !== undefined) {
      derniereVente.value = null
      selection.value = [...selection.value, place.id]
      tarifs.value = { ...tarifs.value, [place.id]: premierTarif.id }
    }
  }

  /** Encaisse la vente: les places sont aussitôt vendues, sur le site comme au guichet. */
  async function vendre(seanceId: number): Promise<Reservation> {
    const reponse = await api.post<Element<Reservation>>(`/guichet/seances/${seanceId}/ventes`, {
      billets: placesChoisies.value.map((place) => ({
        place_id: place.id,
        tarif_id: tarifs.value[place.id],
      })),
    })
    derniereVente.value = reponse.data
    selection.value = []
    tarifs.value = {}
    return reponse.data
  }

  return {
    plan,
    selection,
    tarifs,
    derniereVente,
    placesChoisies,
    total,
    chargerPlan,
    basculer,
    vendre,
  }
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api } from '@/services/api'
import { lirePlan, separerLesPlacesPrises } from '@/services/planDeSalle'
import type { Element } from '@/types/pagination'
import type { BilletChoisi, PlaceDuPlan, PlanDeSalle, Reservation } from '@/types/reservation'

/**
 * Réservation en ligne (US-08 et US-09): le plan de salle d'une séance, les places choisies,
 * la réservation qui les bloque pendant 10 minutes, puis son paiement.
 */
export const useReservationStore = defineStore('reservation', () => {
  const plan = ref<PlanDeSalle | null>(null)
  /** Places choisies sur le plan. Elles sont gardées le temps d'une connexion. */
  const selection = ref<number[]>([])
  /** Séance des places choisies: ouvrir le plan d'une autre séance vide la sélection. */
  const seanceDeLaSelection = ref<number | null>(null)
  const reservation = ref<Reservation | null>(null)

  const placesChoisies = computed<PlaceDuPlan[]>(
    () => plan.value?.places.filter((place) => selection.value.includes(place.id)) ?? [],
  )

  /**
   * Charge ou relit le plan d'une séance. Les places choisies qui viennent d'être prises
   * par un autre spectateur quittent la sélection: elles sont renvoyées pour l'annoncer.
   */
  async function chargerPlan(seanceId: number): Promise<PlaceDuPlan[]> {
    if (seanceDeLaSelection.value !== seanceId) {
      selection.value = []
      seanceDeLaSelection.value = seanceId
    }
    plan.value = await lirePlan(seanceId)
    const { prises, restantes } = separerLesPlacesPrises(plan.value, selection.value)
    selection.value = restantes
    return prises
  }

  /** Choisit une place libre, dans la limite du plan, ou la retire de la sélection. */
  function basculer(place: PlaceDuPlan): void {
    if (selection.value.includes(place.id)) {
      selection.value = selection.value.filter((id) => id !== place.id)
    } else if (place.libre && selection.value.length < (plan.value?.places_max ?? 0)) {
      selection.value = [...selection.value, place.id]
    }
  }

  /** Bloque les places choisies pendant 10 minutes: elles deviennent une réservation. */
  async function bloquer(seanceId: number): Promise<Reservation> {
    const reponse = await api.post<Element<Reservation>>(`/seances/${seanceId}/reservations`, {
      places: selection.value,
    })
    reservation.value = reponse.data
    selection.value = []
    return reponse.data
  }

  async function chargerReservation(id: number): Promise<Reservation> {
    reservation.value = (await api.get<Element<Reservation>>(`/reservations/${id}`)).data
    return reservation.value
  }

  /** Abandonne la réservation en attente: ses places sont aussitôt libérées. */
  async function abandonner(id: number): Promise<void> {
    await api.delete(`/reservations/${id}`)
    if (reservation.value?.id === id) {
      reservation.value = { ...reservation.value, statut: 'annulee', secondes_restantes: 0 }
    }
  }

  /**
   * Envoie le tarif choisi pour chaque place et ouvre le paiement: renvoie l'adresse de la page
   * de paiement de Stripe, où le spectateur saisit sa carte.
   */
  async function payer(enCours: Reservation, tarifs: Record<number, number>): Promise<string> {
    const reponse = await api.post<Element<{ url: string }>>(
      `/reservations/${enCours.id}/paiement`,
      {
        billets: enCours.places.map((place): BilletChoisi => ({
          place_id: place.id,
          tarif_id: tarifs[place.id] ?? 0,
        })),
      },
    )
    return reponse.data.url
  }

  /** Au retour de la page de paiement: l'API demande à Stripe si le paiement est accepté. */
  async function verifierPaiement(id: number): Promise<Reservation> {
    reservation.value = (
      await api.post<Element<Reservation>>(`/reservations/${id}/paiement/verification`)
    ).data
    return reservation.value
  }

  /**
   * Abandonne la réservation et remet ses places dans la sélection, pour la modifier sur
   * le plan. Renvoie la séance, dont le plan s'ouvre ensuite.
   */
  async function modifier(enCours: Reservation): Promise<number> {
    await abandonner(enCours.id)
    seanceDeLaSelection.value = enCours.seance.id
    selection.value = enCours.places.map((place) => place.id)
    return enCours.seance.id
  }

  return {
    plan,
    selection,
    reservation,
    placesChoisies,
    chargerPlan,
    basculer,
    bloquer,
    chargerReservation,
    abandonner,
    modifier,
    payer,
    verifierPaiement,
  }
})

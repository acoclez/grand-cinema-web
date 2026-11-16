import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/services/api'
import type { Element, ListePaginee } from '@/types/pagination'
import type { ReservationAuGuichet, ReservationTrouvee } from '@/types/reservation'
import type { SeancePublique } from '@/types/seance'
import { jourIso } from '@/utils/format'

/**
 * Recherche des réservations au guichet (US-15). Les critères et les résultats sont gardés dans
 * le store: après avoir ouvert une réservation, l'agent retrouve sa recherche.
 */
export const useRechercheReservationsStore = defineStore('rechercheReservations', () => {
  /** Numéro de réservation, nom ou adresse e-mail du client. */
  const recherche = ref('')
  /** Jour des séances proposées, au format AAAA-MM-JJ. */
  const jour = ref(jourIso())
  /** Séance choisie, null pour toutes. */
  const seance = ref<number | null>(null)
  const seances = ref<SeancePublique[]>([])
  const resultats = ref<ReservationTrouvee[]>([])
  const page = ref(1)
  const dernierePage = ref(1)
  const total = ref(0)
  /** Vrai une fois une recherche lancée: distingue « aucun résultat » de « rien cherché ». */
  const recherchee = ref(false)

  async function chargerSeances(): Promise<void> {
    seances.value = (await api.get<{ data: SeancePublique[] }>(`/seances?date=${jour.value}`)).data
    if (!seances.value.some((candidate) => candidate.id === seance.value)) {
      seance.value = null
    }
  }

  async function rechercher(numeroDePage = 1): Promise<void> {
    const parametres = new URLSearchParams({ page: String(numeroDePage) })
    if (recherche.value.trim() !== '') {
      parametres.set('recherche', recherche.value.trim())
    }
    if (seance.value !== null) {
      parametres.set('seance', String(seance.value))
    }
    const reponse = await api.get<ListePaginee<ReservationTrouvee>>(
      `/guichet/reservations?${parametres}`,
    )
    resultats.value = reponse.data
    page.value = reponse.meta.current_page
    dernierePage.value = reponse.meta.last_page
    total.value = reponse.meta.total
    recherchee.value = true
  }

  async function chargerReservation(id: number): Promise<ReservationAuGuichet> {
    return (await api.get<Element<ReservationAuGuichet>>(`/guichet/reservations/${id}`)).data
  }

  return {
    recherche,
    jour,
    seance,
    seances,
    resultats,
    page,
    dernierePage,
    total,
    recherchee,
    chargerSeances,
    rechercher,
    chargerReservation,
  }
})

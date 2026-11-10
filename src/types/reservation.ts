import type { FilmAlAffiche } from '@/types/film'
import type { TypeSalle } from '@/types/salle'
import type { LangueSeance } from '@/types/seance'

/** Place du plan de salle d'une séance. */
export interface PlaceDuPlan {
  id: number
  rangee: string
  numero: number
  /** Place réservée aux personnes à mobilité réduite. */
  pmr: boolean
  /** Ni vendue, ni bloquée par une réservation en cours de paiement. */
  libre: boolean
}

/** Plan de salle d'une séance (US-08), relu toutes les 5 secondes. */
export interface PlanDeSalle {
  seance: {
    id: number
    film: Pick<FilmAlAffiche, 'id' | 'titre' | 'duree_minutes' | 'classification' | 'affiche_url'>
    salle: { nom: string; type: TypeSalle; capacite: number }
    /** Début et fin au format ISO 8601, à l'heure de Paris. */
    debut: string
    fin: string
    langue: LangueSeance
  }
  /** Faux quand la séance a commencé: le plan reste consultable, sans réservation. */
  reservable: boolean
  places_max: number
  blocage_minutes: number
  places_libres: number
  /** Places triées par rangée puis par numéro. */
  places: PlaceDuPlan[]
}

export type StatutReservation = 'en_attente' | 'confirmee' | 'annulee' | 'expiree'

/** Réservation du spectateur connecté. */
export interface Reservation {
  id: number
  /** Numéro communiqué au spectateur, par exemple R-7KX4M2PA. */
  numero: string
  statut: StatutReservation
  /** Fin du blocage des places, null une fois la réservation confirmée, annulée ou expirée. */
  expire_at: string | null
  /** Calculées par l'API, pour ne pas dépendre de l'horloge de l'appareil. */
  secondes_restantes: number
  seance: {
    id: number
    film: { id: number; titre: string }
    salle: { nom: string; type: TypeSalle }
    debut: string
    langue: LangueSeance
  }
  places: Omit<PlaceDuPlan, 'libre'>[]
}

/** Libellé d'une place: rangée et numéro, par exemple B7. */
export function libellePlace(place: Pick<PlaceDuPlan, 'rangee' | 'numero'>): string {
  return `${place.rangee}${place.numero}`
}

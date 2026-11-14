import type { FilmAlAffiche } from '@/types/film'
import type { TypeSalle } from '@/types/salle'
import type { LangueSeance, Tarif } from '@/types/seance'

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

/** Tarif d'une séance, lu sur le plan de salle. */
export type TarifDuPlan = Tarif & { id: number }

/** Plan de salle d'une séance (US-08), relu toutes les 5 secondes, sur le site comme au guichet. */
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
  /** Tarifs de la séance, dans l'ordre où l'administrateur les a saisis. */
  tarifs: TarifDuPlan[]
  /** Places triées par rangée puis par numéro. */
  places: PlaceDuPlan[]
}

export type StatutReservation = 'en_attente' | 'confirmee' | 'annulee' | 'expiree'

export type CanalVente = 'en_ligne' | 'guichet'

/** Place d'une réservation, avec son tarif et son prix une fois le tarif choisi. */
export interface PlaceReservee extends Omit<PlaceDuPlan, 'libre'> {
  tarif: string | null
  prix_centimes: number
}

/** Réservation du spectateur connecté, ou vente au guichet. */
export interface Reservation {
  id: number
  /** Numéro communiqué au spectateur, par exemple R-7KX4M2PA. */
  numero: string
  statut: StatutReservation
  canal: CanalVente
  /** Somme des prix des billets, 0 tant que les tarifs ne sont pas choisis. */
  montant_centimes: number
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
  places: PlaceReservee[]
}

/** Libellé d'une place: rangée et numéro, par exemple B7. */
export function libellePlace(place: Pick<PlaceDuPlan, 'rangee' | 'numero'>): string {
  return `${place.rangee}${place.numero}`
}

/** Places libres du plan, par exemple « 5 places libres sur 6 ». */
export function placesLibres(plan: PlanDeSalle): string {
  const libres = plan.places_libres
  const capacite = plan.seance.salle.capacite
  return libres === 1 ? `1 place libre sur ${capacite}` : `${libres} places libres sur ${capacite}`
}

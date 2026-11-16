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

export const LIBELLES_STATUT_RESERVATION: Record<StatutReservation, string> = {
  en_attente: 'En attente de paiement',
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  expiree: 'Expirée',
}

export const LIBELLES_CANAL: Record<CanalVente, string> = {
  en_ligne: 'En ligne',
  guichet: 'Guichet',
}

/** Statut du dernier paiement en ligne d'une réservation (US-09). */
export type StatutPaiement = 'en_attente' | 'accepte' | 'refuse' | 'rembourse'

/** Place et tarif choisi, envoyés au guichet comme au paiement en ligne. */
export interface BilletChoisi {
  place_id: number
  tarif_id: number
}

/** Place d'une réservation, avec son tarif et son prix une fois le tarif choisi. */
export interface PlaceReservee extends Omit<PlaceDuPlan, 'libre'> {
  tarif: string | null
  prix_centimes: number
  /** Heure du passage en salle, null tant que le billet n'a pas servi. */
  utilise_at: string | null
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
  /** Statut du dernier paiement en ligne, null avant le paiement et pour une vente au guichet. */
  paiement: StatutPaiement | null
  seance: {
    id: number
    film: { id: number; titre: string }
    salle: { nom: string; type: TypeSalle }
    debut: string
    langue: LangueSeance
    /** Tarifs à choisir pour chaque place avant de payer. */
    tarifs: TarifDuPlan[]
  }
  places: PlaceReservee[]
}

/** Client d'une réservation en ligne, vu au guichet (US-15). */
export interface ClientDeReservation {
  prenom: string
  nom: string
  email: string
}

/** Réservation vue par l'agent d'accueil: le client en plus, null au guichet ou compte supprimé. */
export type ReservationAuGuichet = Reservation & { client: ClientDeReservation | null }

/** Réservation dans les résultats d'une recherche au guichet. */
export interface ReservationTrouvee {
  id: number
  numero: string
  statut: StatutReservation
  canal: CanalVente
  client: ClientDeReservation | null
  seance: { id: number; film: { id: number; titre: string }; salle: { nom: string }; debut: string }
  /** Nombre de places: 0 une fois les places d'une réservation annulée ou expirée libérées. */
  places: number
  montant_centimes: number
  paiement: StatutPaiement | null
}

/** Nom du client, ou d'où vient la réservation quand elle n'a pas de client. */
export function libelleClient(reservation: Pick<ReservationTrouvee, 'client' | 'canal'>): string {
  if (reservation.client !== null) {
    return `${reservation.client.prenom} ${reservation.client.nom}`
  }
  return reservation.canal === 'guichet' ? 'Vente au guichet' : 'Compte supprimé'
}

/** Paiement d'une réservation: en ligne par Stripe, ou encaissé au guichet. */
export function libellePaiement(reservation: Pick<Reservation, 'paiement' | 'canal'>): string {
  const libelles: Record<StatutPaiement, string> = {
    en_attente: 'En cours sur Stripe',
    accepte: 'Accepté (Stripe)',
    refuse: 'Abandonné ou refusé',
    rembourse: 'Remboursé',
  }
  if (reservation.paiement !== null) {
    return libelles[reservation.paiement]
  }
  return reservation.canal === 'guichet' ? 'Encaissé au guichet' : 'Aucun paiement'
}

/** Libellé d'une place: rangée et numéro, par exemple B7. */
export function libellePlace(place: Pick<PlaceDuPlan, 'rangee' | 'numero'>): string {
  return `${place.rangee}${place.numero}`
}

/** Montant à payer: le prix du tarif choisi pour chaque place. */
export function montantDesTarifs(
  placeIds: number[],
  tarifs: TarifDuPlan[],
  choix: Record<number, number>,
): number {
  return placeIds.reduce(
    (somme, id) => somme + (tarifs.find((tarif) => tarif.id === choix[id])?.prix_centimes ?? 0),
    0,
  )
}

/** Places libres du plan, par exemple « 5 places libres sur 6 ». */
export function placesLibres(plan: PlanDeSalle): string {
  const libres = plan.places_libres
  const capacite = plan.seance.salle.capacite
  return libres === 1 ? `1 place libre sur ${capacite}` : `${libres} places libres sur ${capacite}`
}

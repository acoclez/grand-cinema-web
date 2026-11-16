/** Types de salle, identiques à ceux de l'API. */
export type TypeSalle = 'premium_imax' | 'standard' | 'vip' | 'evenementielle'

export const LIBELLES_TYPE_SALLE: Record<TypeSalle, string> = {
  premium_imax: 'Premium IMAX',
  standard: 'Standard',
  vip: 'VIP',
  evenementielle: 'Événementielle',
}

/** Salle avec le nombre de places de son plan. */
export interface Salle {
  id: number
  nom: string
  type: TypeSalle
  capacite: number
  places: number
  places_pmr: number
}

/** Réponse de l'API: les salles et le total des places du cinéma. */
export interface ListeSalles {
  data: Salle[]
  meta: { total_places: number }
}

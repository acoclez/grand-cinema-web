import type { LangueSeance } from '@/types/seance'

/** Billet électronique d'une place (US-10), à présenter à l'entrée de la salle. */
export interface Billet {
  id: number
  reservation: { id: number; numero: string }
  seance: {
    id: number
    film: { id: number; titre: string }
    salle: { nom: string }
    /** Début au format ISO 8601, à l'heure de Paris. */
    debut: string
    langue: LangueSeance
  }
  place: { rangee: string; numero: number; pmr: boolean }
  tarif: string | null
  prix_centimes: number
  /** Heure du passage en salle, null tant que le billet n'a pas servi. */
  utilise_at: string | null
  /** QR code en image SVG (adresse data:), qui ne contient que le jeton aléatoire du billet. */
  qr_code: string
}

/** Billets d'une même réservation, pour une séance. */
export interface BilletsDUneReservation {
  reservation: Billet['reservation']
  seance: Billet['seance']
  billets: Billet[]
}

/** Nom du fichier PDF d'un billet, le même que celui de l'e-mail: billet-R-7KX4M2PA-B12.pdf. */
export function nomDuFichier(billet: Billet): string {
  return `billet-${billet.reservation.numero}-${billet.place.rangee}${billet.place.numero}.pdf`
}

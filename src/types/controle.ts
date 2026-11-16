/** Résultat du contrôle d'un billet à l'entrée (US-11). */
export type ResultatDuControle = 'valide' | 'deja_utilise' | 'invalide'

/** Titre affiché en grand pour l'agent d'accueil. */
export const TITRES_DU_CONTROLE: Record<ResultatDuControle, string> = {
  valide: 'Valide',
  deja_utilise: 'Déjà utilisé',
  invalide: 'Invalide',
}

/** Réponse de l'API au contrôle d'un billet. */
export interface ControleBillet {
  resultat: ResultatDuControle
  /** Message détaillé, par exemple l'heure du premier passage d'un billet déjà utilisé. */
  message: string
  /** Billet reconnu, null pour un QR code inconnu ou un billet non payé. */
  billet: {
    film: string
    salle: string
    /** Début de la séance du billet, au format ISO 8601. */
    debut: string
    place: { rangee: string; numero: number; pmr: boolean }
    tarif: string | null
    /** Heure du premier passage en salle. */
    utilise_at: string | null
  } | null
}

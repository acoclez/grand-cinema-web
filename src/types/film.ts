/** Classifications acceptées par l'API, dans l'ordre d'affichage. */
export const CLASSIFICATIONS = ['Tous publics', '-12', '-16', '-18'] as const

export type Classification = (typeof CLASSIFICATIONS)[number]

/** Film tel que l'API le renvoie au back-office, archivé ou non. */
export interface Film {
  id: number
  titre: string
  synopsis: string
  duree_minutes: number
  genre: string
  classification: Classification
  langue_originale: string | null
  affiche_url: string | null
  bande_annonce_url: string | null
  archive: boolean
  /** Date d'archivage au format ISO 8601, null si le film est à l'affiche. */
  archive_le: string | null
}

/** Données envoyées à la création et à la modification d'un film. */
export interface DonneesFilm {
  titre: string
  synopsis: string
  duree_minutes: number | null
  genre: string
  classification: Classification | ''
  langue_originale: string
  affiche_url: string | null
  bande_annonce_url: string | null
}

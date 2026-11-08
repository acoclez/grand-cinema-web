import type { FilmAlAffiche } from '@/types/film'
import type { TypeSalle } from '@/types/salle'

export type LangueSeance = 'vo' | 'vf'

export type StatutSeance = 'brouillon' | 'publiee'

export const LANGUES_SEANCE: { valeur: LangueSeance; libelle: string }[] = [
  { valeur: 'vf', libelle: 'VF (version française)' },
  { valeur: 'vo', libelle: 'VO (version originale sous-titrée)' },
]

export interface Tarif {
  libelle: string
  prix_centimes: number
}

/** Séance telle que l'API la renvoie au back-office. */
export interface Seance {
  id: number
  film: { id: number; titre: string; duree_minutes: number; archive: boolean }
  salle: { id: number; nom: string; type: TypeSalle; capacite: number }
  /** Début et fin au format ISO 8601, à l'heure de Paris, par exemple 2026-11-20T20:30:00+01:00. */
  debut: string
  fin: string
  langue: LangueSeance
  statut: StatutSeance
  tarifs: (Tarif & { id: number })[]
  /** Places vendues ou bloquées par une réservation en cours. */
  places_vendues: number
}

/** Données envoyées à la création et à la modification d'une séance. */
export interface DonneesSeance {
  film_id: number | null
  salle_id: number | null
  /** Date et heure de Paris, par exemple 2026-11-20T20:30. */
  debut: string
  langue: LangueSeance | ''
  tarifs: { libelle: string; prix_centimes: number | null }[]
}

/** Séance telle que la voit un visiteur sur la page des séances (US-02). */
export interface SeancePublique {
  id: number
  film: Pick<
    FilmAlAffiche,
    'id' | 'titre' | 'duree_minutes' | 'genre' | 'classification' | 'affiche_url'
  >
  salle: { nom: string; type: TypeSalle }
  /** Début et fin au format ISO 8601, à l'heure de Paris. */
  debut: string
  fin: string
  langue: LangueSeance
  places_restantes: number
  /** Au moins 90 % des places sont vendues. */
  bientot_complet: boolean
  /** Plus aucune place: la séance ne se réserve plus. */
  complet: boolean
}

/** Séances d'un film pour la date choisie. */
export interface SeancesDUnFilm {
  film: SeancePublique['film']
  seances: SeancePublique[]
}

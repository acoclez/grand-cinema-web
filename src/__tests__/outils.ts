import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'

import { creerRouteur } from '@/router'
import { CLE_SESSION } from '@/stores/auth'
import type { ReponseJeton, Utilisateur } from '@/types/compte'
import type { Film } from '@/types/film'
import type { ListePaginee } from '@/types/pagination'
import type { Salle } from '@/types/salle'
import type { Seance, SeancePublique } from '@/types/seance'

export const camille: Utilisateur = {
  id: 1,
  prenom: 'Camille',
  nom: 'Durand',
  email: 'camille.durand@exemple.fr',
  role: 'spectateur',
  pays_residence: null,
  consentement_emails: false,
}

export const administrateur: Utilisateur = {
  id: 2,
  prenom: 'Alex',
  nom: 'Martin',
  email: 'admin@grand-cinema.fr',
  role: 'administrateur',
  pays_residence: 'FR',
  consentement_emails: false,
}

/** Film à l'affiche, à compléter ou modifier selon le test. */
export function filmDeTest(changements: Partial<Film> = {}): Film {
  return {
    id: 1,
    titre: 'Le Souffle du Festival',
    synopsis: 'Trois musiciens traversent la ville pendant la semaine du festival.',
    duree_minutes: 112,
    genre: 'Comédie dramatique',
    classification: 'Tous publics',
    langue_originale: 'Français',
    affiche_url: null,
    bande_annonce_url: null,
    archive: false,
    archive_le: null,
    ...changements,
  }
}

/** Page de films telle que l'API la renvoie. */
export function pageDeFilms(films: Film[], page = 1, dernierePage = 1): ListePaginee<Film> {
  return {
    data: films,
    meta: { current_page: page, last_page: dernierePage, per_page: 20, total: films.length },
  }
}

/** Salle standard, à compléter ou modifier selon le test. */
export function salleDeTest(changements: Partial<Salle> = {}): Salle {
  return {
    id: 3,
    nom: 'Salle 3',
    type: 'standard',
    capacite: 180,
    places: 180,
    places_pmr: 4,
    ...changements,
  }
}

/** Séance publiée le 20 novembre 2026 à 20 h 30, sans place vendue. */
export function seanceDeTest(changements: Partial<Seance> = {}): Seance {
  return {
    id: 1,
    film: { id: 1, titre: 'Le Souffle du Festival', duree_minutes: 112, archive: false },
    salle: { id: 3, nom: 'Salle 3', type: 'standard', capacite: 180 },
    debut: '2026-11-20T20:30:00+01:00',
    fin: '2026-11-20T22:22:00+01:00',
    langue: 'vo',
    statut: 'publiee',
    tarifs: [
      { id: 1, libelle: 'Plein', prix_centimes: 950 },
      { id: 2, libelle: 'Réduit', prix_centimes: 700 },
    ],
    places_vendues: 0,
    ...changements,
  }
}

/** Séance du public le 12 novembre 2026 à 20 h 30, avec toutes ses places libres. */
export function seancePubliqueDeTest(changements: Partial<SeancePublique> = {}): SeancePublique {
  return {
    id: 1,
    film: {
      id: 1,
      titre: 'Le Souffle du Festival',
      duree_minutes: 112,
      genre: 'Comédie dramatique',
      classification: 'Tous publics',
      affiche_url: null,
    },
    salle: { nom: 'Salle 3', type: 'standard' },
    debut: '2026-11-12T20:30:00+01:00',
    fin: '2026-11-12T22:22:00+01:00',
    langue: 'vf',
    places_restantes: 180,
    bientot_complet: false,
    complet: false,
    ...changements,
  }
}

export function reponseJeton(utilisateur: Utilisateur = camille): ReponseJeton {
  return { access_token: 'jeton-de-test', token_type: 'bearer', expires_in: 3600, utilisateur }
}

/** Simule une session ouverte lors d'une visite précédente. */
export function simulerSessionOuverte(utilisateur: Utilisateur = camille): void {
  localStorage.setItem(
    CLE_SESSION,
    JSON.stringify({ jeton: 'jeton-de-test', expireLe: Date.now() + 3_600_000, utilisateur }),
  )
}

/**
 * Monte un composant avec un store et un routeur neufs, sur l'adresse indiquée.
 * preparer s'exécute juste avant le montage, par exemple pour choisir le jour affiché d'un store.
 */
export async function monter(
  composant: Component,
  adresse = '/',
  proprietes: Record<string, unknown> = {},
  preparer: () => void = () => undefined,
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = creerRouteur(createMemoryHistory())
  await router.push(adresse)
  preparer()
  const page = mount(composant, { props: proprietes, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { page, router }
}

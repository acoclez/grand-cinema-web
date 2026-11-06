import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'

import { creerRouteur } from '@/router'
import { CLE_SESSION } from '@/stores/auth'
import type { ReponseJeton, Utilisateur } from '@/types/compte'
import type { Film } from '@/types/film'
import type { ListePaginee } from '@/types/pagination'

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

/** Monte un composant avec un store et un routeur neufs, sur l'adresse indiquée. */
export async function monter(
  composant: Component,
  adresse = '/',
  proprietes: Record<string, unknown> = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = creerRouteur(createMemoryHistory())
  await router.push(adresse)
  const page = mount(composant, { props: proprietes, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { page, router }
}

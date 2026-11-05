import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import { createMemoryHistory } from 'vue-router'

import { creerRouteur } from '@/router'
import { CLE_SESSION } from '@/stores/auth'
import type { ReponseJeton, Utilisateur } from '@/types/compte'

export const camille: Utilisateur = {
  id: 1,
  prenom: 'Camille',
  nom: 'Durand',
  email: 'camille.durand@exemple.fr',
  role: 'spectateur',
  pays_residence: null,
  consentement_emails: false,
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
export async function monter(composant: Component, adresse = '/') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = creerRouteur(createMemoryHistory())
  await router.push(adresse)
  const page = mount(composant, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { page, router }
}

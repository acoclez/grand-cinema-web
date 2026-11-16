import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { administrateur, camille, simulerSessionOuverte } from '@/__tests__/outils'
import { creerRouteur } from '@/router'
import { destinationApresConnexion } from '@/router/redirection'
import AccueilView from '@/views/AccueilView.vue'

function nouveauRouteur() {
  setActivePinia(createPinia())
  const router = creerRouteur(createMemoryHistory())
  router.addRoute({
    path: '/back-office',
    name: 'back-office',
    component: AccueilView,
    meta: { roles: ['agent', 'administrateur'] },
  })
  return router
}

describe('garde de navigation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('une page réservée renvoie un visiteur vers la connexion en gardant la page demandée', async () => {
    const router = nouveauRouteur()

    await router.push('/mon-compte')

    expect(router.currentRoute.value.name).toBe('connexion')
    expect(router.currentRoute.value.query.redirection).toBe('/mon-compte')
  })

  it('un compte connecté accède à son espace et n a plus accès à la connexion', async () => {
    simulerSessionOuverte()
    const router = nouveauRouteur()

    await router.push('/mon-compte')
    expect(router.currentRoute.value.name).toBe('mon-compte')

    await router.push('/connexion')
    expect(router.currentRoute.value.name).toBe('mon-compte')
  })

  it('une page réservée à d autres rôles renvoie vers l accueil', async () => {
    simulerSessionOuverte()
    const router = nouveauRouteur()
    await router.push('/back-office')
    expect(router.currentRoute.value.name).toBe('accueil')

    simulerSessionOuverte({ ...camille, role: 'agent' })
    const routeurAgent = nouveauRouteur()
    await routeurAgent.push('/back-office')
    expect(routeurAgent.currentRoute.value.name).toBe('back-office')
  })

  it('la gestion des films est réservée à l administrateur', async () => {
    simulerSessionOuverte({ ...camille, role: 'agent' })
    const routeurAgent = nouveauRouteur()
    await routeurAgent.push('/admin/films')
    expect(routeurAgent.currentRoute.value.name).toBe('accueil')

    simulerSessionOuverte(administrateur)
    const routeurAdmin = nouveauRouteur()
    await routeurAdmin.push('/admin/films/3/modifier')
    expect(routeurAdmin.currentRoute.value.name).toBe('admin-film-modifier')
    expect(routeurAdmin.currentRoute.value.params.id).toBe('3')
    expect(document.title).toBe('Modifier un film – Le Grand Cinéma')

    // Un identifiant qui n'est pas un nombre ne correspond à aucune page.
    await routeurAdmin.push('/admin/films/abc/modifier')
    expect(routeurAdmin.currentRoute.value.name).toBe('accueil')
  })

  it('la gestion des séances et des salles est réservée à l administrateur', async () => {
    simulerSessionOuverte({ ...camille, role: 'agent' })
    const routeurAgent = nouveauRouteur()
    await routeurAgent.push('/admin/seances')
    expect(routeurAgent.currentRoute.value.name).toBe('accueil')

    simulerSessionOuverte(administrateur)
    const routeurAdmin = nouveauRouteur()
    await routeurAdmin.push('/admin/seances/5/modifier')
    expect(routeurAdmin.currentRoute.value.name).toBe('admin-seance-modifier')
    expect(document.title).toBe('Modifier une séance – Le Grand Cinéma')

    await routeurAdmin.push('/admin/salles')
    expect(document.title).toBe('Salles – Le Grand Cinéma')
  })

  it('les films à l affiche et leur fiche sont ouverts à tous, sans compte', async () => {
    const router = nouveauRouteur()

    await router.push('/films')
    expect(router.currentRoute.value.name).toBe('films')
    expect(document.title).toBe('Films à l’affiche – Le Grand Cinéma')

    await router.push('/films/3')
    expect(router.currentRoute.value.name).toBe('fiche-film')
    expect(router.currentRoute.value.params.id).toBe('3')

    await router.push('/seances')
    expect(router.currentRoute.value.name).toBe('seances')
    expect(document.title).toBe('Séances – Le Grand Cinéma')
  })

  it('une adresse inconnue renvoie vers l accueil et chaque page a son titre', async () => {
    const router = nouveauRouteur()

    await router.push('/page-inconnue')
    expect(router.currentRoute.value.name).toBe('accueil')
    expect(document.title).toBe('Le Grand Cinéma')

    await router.push('/inscription')
    expect(document.title).toBe('Créer un compte – Le Grand Cinéma')
  })
})

describe('destinationApresConnexion', () => {
  it('ramène à une page interne du site, sinon à l espace du compte', () => {
    expect(destinationApresConnexion('/mon-compte?onglet=billets')).toBe(
      '/mon-compte?onglet=billets',
    )
    expect(destinationApresConnexion('//site-externe.example')).toEqual({ name: 'mon-compte' })
    expect(destinationApresConnexion('https://site-externe.example')).toEqual({
      name: 'mon-compte',
    })
    expect(destinationApresConnexion(undefined)).toEqual({ name: 'mon-compte' })
  })
})

import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/compte'
import AccueilView from '@/views/AccueilView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Titre de la page, affiché dans l'onglet du navigateur. */
    titre?: string
    /** Page réservée aux comptes connectés. */
    connexionRequise?: boolean
    /** Page réservée à certains rôles (back-office). */
    roles?: Role[]
    /** Page inutile une fois connecté (connexion, inscription). */
    visiteurSeulement?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'accueil', component: AccueilView },
  {
    path: '/connexion',
    name: 'connexion',
    component: () => import('@/views/ConnexionView.vue'),
    meta: { titre: 'Connexion', visiteurSeulement: true },
  },
  {
    path: '/inscription',
    name: 'inscription',
    component: () => import('@/views/InscriptionView.vue'),
    meta: { titre: 'Créer un compte', visiteurSeulement: true },
  },
  {
    path: '/mot-de-passe-oublie',
    name: 'mot-de-passe-oublie',
    component: () => import('@/views/MotDePasseOublieView.vue'),
    meta: { titre: 'Mot de passe oublié', visiteurSeulement: true },
  },
  {
    // Adresse du lien envoyé par e-mail par l'API (FRONTEND_URL côté API).
    path: '/reinitialiser-mot-de-passe',
    name: 'reinitialiser-mot-de-passe',
    component: () => import('@/views/ReinitialisationView.vue'),
    meta: { titre: 'Nouveau mot de passe' },
  },
  {
    path: '/mon-compte',
    name: 'mon-compte',
    component: () => import('@/views/MonCompteView.vue'),
    meta: { titre: 'Mon espace', connexionRequise: true },
  },
  {
    path: '/admin/films',
    name: 'admin-films',
    component: () => import('@/views/administration/FilmsView.vue'),
    meta: { titre: 'Films', roles: ['administrateur'] },
  },
  {
    path: '/admin/films/nouveau',
    name: 'admin-film-nouveau',
    component: () => import('@/views/administration/FilmFormulaireView.vue'),
    meta: { titre: 'Ajouter un film', roles: ['administrateur'] },
  },
  {
    path: '/admin/films/:id(\\d+)/modifier',
    name: 'admin-film-modifier',
    component: () => import('@/views/administration/FilmFormulaireView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { titre: 'Modifier un film', roles: ['administrateur'] },
  },
  { path: '/:chemin(.*)*', redirect: '/' },
]

/**
 * Crée le routeur et sa garde de navigation: une page réservée renvoie vers la connexion,
 * puis ramène à la page demandée. Une page réservée à d'autres rôles renvoie vers l'accueil.
 * Les tests créent leur propre routeur, avec un historique en mémoire.
 */
export function creerRouteur(historique: RouterHistory): Router {
  const router = createRouter({ history: historique, routes })

  router.beforeEach((destination) => {
    const auth = useAuthStore()
    const reservee = destination.meta.connexionRequise || destination.meta.roles !== undefined

    if (reservee && !auth.estConnecte) {
      return { name: 'connexion', query: { redirection: destination.fullPath } }
    }
    if (destination.meta.roles !== undefined && !auth.aUnDesRoles(destination.meta.roles)) {
      return { name: 'accueil' }
    }
    if (destination.meta.visiteurSeulement && auth.estConnecte) {
      return { name: 'mon-compte' }
    }
    return true
  })

  router.afterEach((destination) => {
    document.title = destination.meta.titre
      ? `${destination.meta.titre} – Le Grand Cinéma`
      : 'Le Grand Cinéma'
  })

  return router
}

export default creerRouteur(createWebHistory(import.meta.env.BASE_URL))

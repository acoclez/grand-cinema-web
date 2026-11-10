import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
  type RouteComponent,
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

const ADMINISTRATEUR: Role[] = ['administrateur']

interface PagesDeGestion {
  /** Segment de l'adresse et du nom de la liste, par exemple seances. */
  ressources: string
  /** Nom des pages d'un élément, par exemple seance. */
  ressource: string
  /** Segment de l'adresse de création, accordé au nom: nouveau ou nouvelle. */
  creation: string
  /** Titres de la liste, de la création et de la modification. */
  titres: [string, string, string]
  liste: RouteComponent
  formulaire: RouteComponent
}

/**
 * Les trois pages du back-office d'une ressource, réservées à l'administrateur:
 * la liste (admin-seances), la création (admin-seance-nouvelle) et la modification
 * (admin-seance-modifier), qui reçoit l'identifiant en nombre. Un identifiant qui
 * n'est pas un nombre ne correspond à aucune page.
 */
function pagesDeGestion(pages: PagesDeGestion): RouteRecordRaw[] {
  const [titreListe, titreCreation, titreModification] = pages.titres
  return [
    {
      path: `/admin/${pages.ressources}`,
      name: `admin-${pages.ressources}`,
      component: pages.liste,
      meta: { titre: titreListe, roles: ADMINISTRATEUR },
    },
    {
      path: `/admin/${pages.ressources}/${pages.creation}`,
      name: `admin-${pages.ressource}-${pages.creation}`,
      component: pages.formulaire,
      meta: { titre: titreCreation, roles: ADMINISTRATEUR },
    },
    {
      path: `/admin/${pages.ressources}/:id(\\d+)/modifier`,
      name: `admin-${pages.ressource}-modifier`,
      component: pages.formulaire,
      props: (route) => ({ id: Number(route.params.id) }),
      meta: { titre: titreModification, roles: ADMINISTRATEUR },
    },
  ]
}

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'accueil', component: AccueilView },
  {
    path: '/films',
    name: 'films',
    component: () => import('@/views/AlAfficheView.vue'),
    meta: { titre: 'Films à l’affiche' },
  },
  {
    path: '/films/:id(\\d+)',
    name: 'fiche-film',
    component: () => import('@/views/FicheFilmView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { titre: 'Film' },
  },
  {
    path: '/seances',
    name: 'seances',
    component: () => import('@/views/SeancesDuJourView.vue'),
    meta: { titre: 'Séances' },
  },
  {
    path: '/seances/:id(\\d+)/places',
    name: 'plan-de-salle',
    component: () => import('@/views/PlanDeSalleView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { titre: 'Choisir ses places' },
  },
  {
    path: '/reservations/:id(\\d+)',
    name: 'reservation',
    component: () => import('@/views/ReservationView.vue'),
    props: (route) => ({ id: Number(route.params.id) }),
    meta: { titre: 'Votre réservation', connexionRequise: true },
  },
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
  ...pagesDeGestion({
    ressources: 'films',
    ressource: 'film',
    creation: 'nouveau',
    titres: ['Films', 'Ajouter un film', 'Modifier un film'],
    liste: () => import('@/views/administration/FilmsView.vue'),
    formulaire: () => import('@/views/administration/FilmFormulaireView.vue'),
  }),
  ...pagesDeGestion({
    ressources: 'seances',
    ressource: 'seance',
    creation: 'nouvelle',
    titres: ['Séances', 'Programmer une séance', 'Modifier une séance'],
    liste: () => import('@/views/administration/SeancesView.vue'),
    formulaire: () => import('@/views/administration/SeanceFormulaireView.vue'),
  }),
  {
    path: '/admin/salles',
    name: 'admin-salles',
    component: () => import('@/views/administration/SallesView.vue'),
    meta: { titre: 'Salles', roles: ['administrateur'] },
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

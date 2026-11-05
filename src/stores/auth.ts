import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api, brancherAuthentification } from '@/services/api'
import type {
  DonneesInscription,
  DonneesReinitialisation,
  ReponseJeton,
  ReponseMessage,
  Role,
  Utilisateur,
} from '@/types/compte'

/** Clé du stockage local qui garde la session entre deux visites. */
export const CLE_SESSION = 'grand-cinema.session'

interface Session {
  jeton: string
  /** Date d'expiration du jeton, en millisecondes. */
  expireLe: number
  utilisateur: Utilisateur
}

function analyser(brute: string | null): Session | null {
  if (!brute) {
    return null
  }
  try {
    return JSON.parse(brute) as Session
  } catch {
    return null
  }
}

/** Session enregistrée lors d'une visite précédente, si son jeton est encore valable. */
function lireSessionEnregistree(): Session | null {
  const session = analyser(localStorage.getItem(CLE_SESSION))
  return session !== null && session.expireLe > Date.now() ? session : null
}

/**
 * Jeton d'accès, profil, et actions de création de compte,
 * de connexion, de déconnexion et de mot de passe oublié.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  let minuterie: ReturnType<typeof setTimeout> | undefined

  const utilisateur = computed(() => session.value?.utilisateur ?? null)
  const jeton = computed(() => session.value?.jeton ?? null)
  const estConnecte = computed(() => session.value !== null)

  /** Enregistre la session et la ferme automatiquement à l'expiration du jeton. */
  function enregistrer(nouvelle: Session | null): void {
    clearTimeout(minuterie)
    session.value = nouvelle
    if (nouvelle === null) {
      localStorage.removeItem(CLE_SESSION)
      return
    }
    localStorage.setItem(CLE_SESSION, JSON.stringify(nouvelle))
    minuterie = setTimeout(() => enregistrer(null), nouvelle.expireLe - Date.now())
  }

  function ouvrirSession(reponse: ReponseJeton): void {
    enregistrer({
      jeton: reponse.access_token,
      expireLe: Date.now() + reponse.expires_in * 1000,
      utilisateur: reponse.utilisateur,
    })
  }

  function fermerSession(): void {
    enregistrer(null)
  }

  async function inscrire(donnees: DonneesInscription): Promise<void> {
    ouvrirSession(await api.post<ReponseJeton>('/auth/inscription', donnees))
  }

  async function connecter(email: string, password: string): Promise<void> {
    ouvrirSession(await api.post<ReponseJeton>('/auth/connexion', { email, password }))
  }

  /** Invalide le jeton côté API. La session est fermée même si l'API ne répond pas. */
  async function deconnecter(): Promise<void> {
    if (session.value !== null) {
      await api.post<void>('/auth/deconnexion').catch(() => undefined)
    }
    fermerSession()
  }

  /** Recharge le profil depuis l'API. */
  async function chargerProfil(): Promise<void> {
    const reponse = await api.get<{ data: Utilisateur }>('/auth/moi')
    if (session.value !== null) {
      enregistrer({ ...session.value, utilisateur: reponse.data })
    }
  }

  async function demanderLien(email: string): Promise<string> {
    return (await api.post<ReponseMessage>('/auth/mot-de-passe-oublie', { email })).message
  }

  async function reinitialiser(donnees: DonneesReinitialisation): Promise<string> {
    return (await api.post<ReponseMessage>('/auth/reinitialiser-mot-de-passe', donnees)).message
  }

  function aUnDesRoles(roles: readonly Role[]): boolean {
    return utilisateur.value !== null && roles.includes(utilisateur.value.role)
  }

  enregistrer(lireSessionEnregistree())
  brancherAuthentification({ jeton: () => jeton.value, jetonRefuse: fermerSession })

  return {
    session,
    utilisateur,
    jeton,
    estConnecte,
    fermerSession,
    inscrire,
    connecter,
    deconnecter,
    chargerProfil,
    demanderLien,
    reinitialiser,
    aUnDesRoles,
  }
})

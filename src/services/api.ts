/**
 * Appels à l'API du Grand Cinéma.
 *
 * Chaque requête envoie et reçoit du JSON. Le jeton du compte connecté est ajouté
 * automatiquement. Une réponse en erreur devient une ErreurApi, qui porte le message
 * et les erreurs par champ renvoyés par l'API.
 */

/** Messages d'erreur de l'API par champ (réponse 422 de Laravel). */
export type ErreursDeChamps = Record<string, string[]>

export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
    readonly erreurs: ErreursDeChamps = {},
  ) {
    super(message)
    this.name = 'ErreurApi'
  }
}

export const MESSAGE_SERVEUR_INJOIGNABLE =
  'Le service est momentanément indisponible. Réessayez dans quelques instants.'
export const MESSAGE_ERREUR_INATTENDUE =
  'Une erreur est survenue. Réessayez dans quelques instants.'

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

interface Authentification {
  /** Jeton à envoyer, ou null si aucun compte n'est connecté. */
  jeton: () => string | null
  /** Appelée quand l'API refuse le jeton envoyé (expiré ou invalidé). */
  jetonRefuse: () => void
}

let authentification: Authentification = { jeton: () => null, jetonRefuse: () => undefined }

/** Branche le service sur le compte connecté. Le store auth l'appelle à sa création. */
export function brancherAuthentification(options: Authentification): void {
  authentification = options
}

function lireMessage(donnees: unknown): string | null {
  if (typeof donnees === 'object' && donnees !== null && 'message' in donnees) {
    return typeof donnees.message === 'string' ? donnees.message : null
  }
  return null
}

function lireErreurs(donnees: unknown): ErreursDeChamps {
  if (typeof donnees === 'object' && donnees !== null && 'errors' in donnees) {
    return donnees.errors as ErreursDeChamps
  }
  return {}
}

async function requete<T>(methode: 'GET' | 'POST', chemin: string, corps?: unknown): Promise<T> {
  const entetes: Record<string, string> = { Accept: 'application/json' }
  const options: RequestInit = { method: methode, headers: entetes }
  if (corps !== undefined) {
    entetes['Content-Type'] = 'application/json'
    options.body = JSON.stringify(corps)
  }
  const jeton = authentification.jeton()
  if (jeton) {
    entetes.Authorization = `Bearer ${jeton}`
  }

  let reponse: Response
  try {
    reponse = await fetch(`${URL_API}${chemin}`, options)
  } catch {
    throw new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0)
  }

  if (reponse.status === 204) {
    return undefined as T
  }

  const donnees: unknown = await reponse.json().catch(() => null)

  if (!reponse.ok) {
    if (reponse.status === 401 && jeton) {
      authentification.jetonRefuse()
    }
    // Une erreur serveur (500) n'a pas de message utile pour le visiteur.
    const message = reponse.status >= 500 ? null : lireMessage(donnees)
    throw new ErreurApi(message ?? MESSAGE_ERREUR_INATTENDUE, reponse.status, lireErreurs(donnees))
  }

  return donnees as T
}

export const api = {
  get: <T>(chemin: string) => requete<T>('GET', chemin),
  post: <T>(chemin: string, corps?: unknown) => requete<T>('POST', chemin, corps),
}

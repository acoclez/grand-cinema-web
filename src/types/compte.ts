/** Rôles d'un compte, identiques à ceux de l'API. */
export type Role = 'spectateur' | 'agent' | 'administrateur'

/** Profil d'un compte, tel que l'API le renvoie. */
export interface Utilisateur {
  id: number
  prenom: string
  nom: string
  email: string
  role: Role
  pays_residence: string | null
  consentement_emails: boolean
}

/** Réponse de l'API à l'inscription et à la connexion. */
export interface ReponseJeton {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  utilisateur: Utilisateur
}

export interface DonneesInscription {
  prenom: string
  nom: string
  email: string
  password: string
  password_confirmation: string
  consentement_emails: boolean
  conditions_acceptees: boolean
}

export interface DonneesReinitialisation {
  token: string
  email: string
  password: string
  password_confirmation: string
}

/** Réponse de l'API qui ne contient qu'un message à afficher. */
export interface ReponseMessage {
  message: string
}

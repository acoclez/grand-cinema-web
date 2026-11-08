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

/** Données envoyées à la modification du profil (US-06). */
export interface DonneesProfil {
  prenom: string
  nom: string
  email: string
  /** Code ISO 3166-1 alpha-2, ou null si le spectateur ne le précise pas. */
  pays_residence: string | null
  consentement_emails: boolean
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

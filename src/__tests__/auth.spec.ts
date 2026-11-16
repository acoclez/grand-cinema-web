import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { camille, reponseJeton, simulerSessionOuverte } from '@/__tests__/outils'
import { api, brancherAuthentification } from '@/services/api'
import { CLE_SESSION, useAuthStore } from '@/stores/auth'
import type { DonneesInscription } from '@/types/compte'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

/** Nouveau store, comme lors d'une nouvelle visite du site. */
function nouvelleVisite() {
  setActivePinia(createPinia())
  return useAuthStore()
}

describe('store auth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('l inscription ouvre une session gardée pour la visite suivante', async () => {
    vi.mocked(api.post).mockResolvedValue(reponseJeton())
    const donnees: DonneesInscription = {
      prenom: 'Camille',
      nom: 'Durand',
      email: 'camille.durand@exemple.fr',
      password: 'un-mot-de-passe-long',
      password_confirmation: 'un-mot-de-passe-long',
      consentement_emails: false,
      conditions_acceptees: true,
    }

    await nouvelleVisite().inscrire(donnees)

    expect(api.post).toHaveBeenCalledWith('/auth/inscription', donnees)
    const auth = nouvelleVisite()
    expect(auth.estConnecte).toBe(true)
    expect(auth.jeton).toBe('jeton-de-test')
    expect(auth.utilisateur).toEqual(camille)
  })

  it('la connexion envoie l adresse et le mot de passe', async () => {
    vi.mocked(api.post).mockResolvedValue(reponseJeton())
    const auth = nouvelleVisite()

    await auth.connecter('camille.durand@exemple.fr', 'un-mot-de-passe-long')

    expect(api.post).toHaveBeenCalledWith('/auth/connexion', {
      email: 'camille.durand@exemple.fr',
      password: 'un-mot-de-passe-long',
    })
    expect(auth.estConnecte).toBe(true)
  })

  it('une session expirée ou illisible n est pas restaurée', () => {
    localStorage.setItem(
      CLE_SESSION,
      JSON.stringify({ jeton: 'ancien', expireLe: Date.now() - 1000, utilisateur: camille }),
    )
    expect(nouvelleVisite().estConnecte).toBe(false)
    expect(localStorage.getItem(CLE_SESSION)).toBeNull()

    localStorage.setItem(CLE_SESSION, 'contenu illisible')
    expect(nouvelleVisite().estConnecte).toBe(false)
  })

  it('la session se ferme à l expiration du jeton', async () => {
    vi.useFakeTimers()
    vi.mocked(api.post).mockResolvedValue({ ...reponseJeton(), expires_in: 60 })
    const auth = nouvelleVisite()
    await auth.connecter('camille.durand@exemple.fr', 'un-mot-de-passe-long')

    vi.advanceTimersByTime(59_000)
    expect(auth.estConnecte).toBe(true)
    vi.advanceTimersByTime(1_000)
    expect(auth.estConnecte).toBe(false)
  })

  it('la déconnexion invalide le jeton et ferme la session même si l API ne répond pas', async () => {
    simulerSessionOuverte()
    vi.mocked(api.post).mockRejectedValue(new Error('réseau coupé'))
    const auth = nouvelleVisite()

    await auth.deconnecter()

    expect(api.post).toHaveBeenCalledWith('/auth/deconnexion')
    expect(auth.estConnecte).toBe(false)
    expect(localStorage.getItem(CLE_SESSION)).toBeNull()
  })

  it('fournit le jeton au service api et ferme la session quand l API le refuse', () => {
    simulerSessionOuverte()
    const auth = nouvelleVisite()
    const branchement = vi.mocked(brancherAuthentification).mock.lastCall?.[0]

    expect(branchement?.jeton()).toBe('jeton-de-test')
    branchement?.jetonRefuse()
    expect(auth.estConnecte).toBe(false)
  })

  it('recharge le profil depuis l API', async () => {
    simulerSessionOuverte()
    vi.mocked(api.get).mockResolvedValue({ data: { ...camille, consentement_emails: true } })
    const auth = nouvelleVisite()

    await auth.chargerProfil()

    expect(api.get).toHaveBeenCalledWith('/auth/moi')
    expect(auth.utilisateur?.consentement_emails).toBe(true)
  })

  it('transmet les demandes de mot de passe oublié et renvoie le message de l API', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Message de l’API.' })
    const auth = nouvelleVisite()
    const donnees = {
      token: 'jeton-du-lien',
      email: 'camille.durand@exemple.fr',
      password: 'nouveau-mot-de-passe',
      password_confirmation: 'nouveau-mot-de-passe',
    }

    await expect(auth.demanderLien('camille.durand@exemple.fr')).resolves.toBe('Message de l’API.')
    await expect(auth.reinitialiser(donnees)).resolves.toBe('Message de l’API.')

    expect(api.post).toHaveBeenCalledWith('/auth/mot-de-passe-oublie', {
      email: 'camille.durand@exemple.fr',
    })
    expect(api.post).toHaveBeenCalledWith('/auth/reinitialiser-mot-de-passe', donnees)
  })

  it('vérifie le rôle du compte connecté', () => {
    expect(nouvelleVisite().aUnDesRoles(['spectateur'])).toBe(false)

    simulerSessionOuverte()
    const auth = nouvelleVisite()
    expect(auth.aUnDesRoles(['spectateur'])).toBe(true)
    expect(auth.aUnDesRoles(['agent', 'administrateur'])).toBe(false)
  })
})

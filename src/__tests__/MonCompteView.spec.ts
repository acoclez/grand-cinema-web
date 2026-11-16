import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { administrateur, camille, monter, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '@/services/api'
import { CLE_SESSION, useAuthStore } from '@/stores/auth'
import type { Utilisateur } from '@/types/compte'
import MonCompteView from '@/views/MonCompteView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

async function monterAvec(profil: Utilisateur = camille) {
  simulerSessionOuverte(profil)
  vi.mocked(api.get).mockResolvedValue({ data: profil })
  return monter(MonCompteView, '/mon-compte')
}

describe('page mon espace', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('ouvre le formulaire avec le profil relu depuis l API', async () => {
    const { page } = await monterAvec({
      ...camille,
      pays_residence: 'BE',
      consentement_emails: true,
    })

    expect(api.get).toHaveBeenCalledWith('/auth/moi')
    expect(page.text()).toContain('Bonjour Camille.')
    expect((page.find('#profil-nom').element as HTMLInputElement).value).toBe('Durand')
    expect((page.find('#profil-email').element as HTMLInputElement).value).toBe(
      'camille.durand@exemple.fr',
    )
    expect((page.find('#profil-pays').element as HTMLSelectElement).value).toBe('BE')
    expect((page.find('#profil-consentement').element as HTMLInputElement).checked).toBe(true)
  })

  it('enregistre les coordonnées et le pays de résidence modifiés', async () => {
    const { page } = await monterAvec()
    const modifie = { ...camille, nom: 'Martin', pays_residence: 'BE' }
    vi.mocked(api.put).mockResolvedValue({ data: modifie })

    await page.find('#profil-nom').setValue('Martin')
    await page.find('#profil-pays').setValue('BE')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/auth/moi', {
      prenom: 'Camille',
      nom: 'Martin',
      email: 'camille.durand@exemple.fr',
      pays_residence: 'BE',
      consentement_emails: false,
    })
    expect(page.find('[role="status"]').text()).toBe('Vos informations sont enregistrées.')
    expect(useAuthStore().utilisateur?.nom).toBe('Martin')
  })

  it('le consentement aux e-mails, décoché par défaut, se modifie à tout moment', async () => {
    const { page } = await monterAvec()
    vi.mocked(api.put).mockResolvedValue({ data: { ...camille, consentement_emails: true } })
    const caseConsentement = page.find('#profil-consentement')

    expect((caseConsentement.element as HTMLInputElement).checked).toBe(false)
    await caseConsentement.setValue(true)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith(
      '/auth/moi',
      expect.objectContaining({ consentement_emails: true }),
    )
  })

  it('le pays de résidence est facultatif et peut être effacé', async () => {
    const { page } = await monterAvec({ ...camille, pays_residence: 'FR' })
    vi.mocked(api.put).mockResolvedValue({ data: camille })
    const nonPrecise = page.find('#profil-pays option[value=""]')

    expect(nonPrecise.text()).toBe('Non précisé')
    expect(nonPrecise.attributes('disabled')).toBeUndefined()
    expect(page.find('#profil-pays option[value="BE"]').text()).toBe('Belgique')
    await page.find('#profil-pays').setValue('')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith(
      '/auth/moi',
      expect.objectContaining({ pays_residence: null }),
    )
  })

  it('les erreurs de l API s affichent sous les champs', async () => {
    const { page } = await monterAvec()
    vi.mocked(api.put).mockRejectedValue(
      new ErreurApi('Données invalides.', 422, {
        email: ['Un compte existe déjà avec cette adresse e-mail.'],
      }),
    )

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.find('#profil-email-erreur').text()).toBe(
      'Un compte existe déjà avec cette adresse e-mail.',
    )
    expect(page.find('[role="status"]').exists()).toBe(false)
  })

  it('la suppression du compte se confirme avec le mot de passe, puis ramène à l accueil', async () => {
    const { page, router } = await monterAvec()
    vi.mocked(api.delete).mockResolvedValue(undefined)

    expect(page.find('#suppression-mot-de-passe').exists()).toBe(false)
    await page.find('.zone-sensible button').trigger('click')
    await page.find('#suppression-mot-de-passe').setValue('Festival-Jazz-2026')
    await page.find('.zone-sensible form').trigger('submit')
    await flushPromises()

    expect(api.delete).toHaveBeenCalledWith('/auth/moi', { password: 'Festival-Jazz-2026' })
    expect(useAuthStore().estConnecte).toBe(false)
    expect(localStorage.getItem(CLE_SESSION)).toBeNull()
    expect(useAuthStore().annonce).toBe(
      'Votre compte est supprimé: vos données personnelles sont effacées.',
    )
    expect(router.currentRoute.value.name).toBe('accueil')
  })

  it('un mauvais mot de passe est signalé et le compte reste ouvert', async () => {
    const { page, router } = await monterAvec()
    vi.mocked(api.delete).mockRejectedValue(
      new ErreurApi('Le mot de passe est incorrect.', 422, {
        password: ['Le mot de passe est incorrect.'],
      }),
    )

    await page.find('.zone-sensible button').trigger('click')
    await page.find('#suppression-mot-de-passe').setValue('mauvais')
    await page.find('.zone-sensible form').trigger('submit')
    await flushPromises()

    expect(page.find('#suppression-mot-de-passe-erreur').text()).toBe(
      'Le mot de passe est incorrect.',
    )
    expect(useAuthStore().estConnecte).toBe(true)
    expect(router.currentRoute.value.name).toBe('mon-compte')
  })

  it('annuler referme la confirmation sans rien supprimer', async () => {
    const { page } = await monterAvec()

    await page.find('.zone-sensible button').trigger('click')
    await page.find('#suppression-mot-de-passe').setValue('Festival-Jazz-2026')
    await page.find('.zone-sensible .bouton-lien').trigger('click')

    expect(page.find('#suppression-mot-de-passe').exists()).toBe(false)
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('un compte du personnel ne voit pas la suppression du compte', async () => {
    const { page } = await monterAvec(administrateur)

    expect(page.find('#profil-nom').exists()).toBe(true)
    expect(page.find('.zone-sensible').exists()).toBe(false)
  })

  it('un jeton refusé renvoie vers la connexion', async () => {
    simulerSessionOuverte()
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Authentification requise.', 401))
    const { router } = await monter(MonCompteView, '/mon-compte')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
    expect(router.currentRoute.value.query.redirection).toBe('/mon-compte')
  })

  it('un service indisponible est signalé', async () => {
    simulerSessionOuverte()
    vi.mocked(api.get).mockRejectedValue(new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0))
    const { page } = await monter(MonCompteView, '/mon-compte')

    expect(page.find('[role="alert"]').text()).toBe(MESSAGE_SERVEUR_INJOIGNABLE)
  })
})

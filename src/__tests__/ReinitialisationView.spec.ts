import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monter } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import ReinitialisationView from '@/views/ReinitialisationView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

const LIEN = '/reinitialiser-mot-de-passe?token=jeton-du-lien&email=camille.durand%40exemple.fr'

async function saisirNouveauMotDePasse(page: Awaited<ReturnType<typeof monter>>['page']) {
  await page.find('#reinitialisation-mot-de-passe').setValue('nouveau-mot-de-passe')
  await page.find('#reinitialisation-confirmation').setValue('nouveau-mot-de-passe')
  await page.find('form').trigger('submit')
  await flushPromises()
}

describe('page nouveau mot de passe', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('le lien reçu permet de choisir un nouveau mot de passe puis de se connecter', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: 'Votre mot de passe a été modifié.' })
    const { page, router } = await monter(ReinitialisationView, LIEN)
    expect(page.text()).toContain('camille.durand@exemple.fr')

    await saisirNouveauMotDePasse(page)

    expect(api.post).toHaveBeenCalledWith('/auth/reinitialiser-mot-de-passe', {
      token: 'jeton-du-lien',
      email: 'camille.durand@exemple.fr',
      password: 'nouveau-mot-de-passe',
      password_confirmation: 'nouveau-mot-de-passe',
    })
    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe('/connexion?motDePasseModifie=1'),
    )
  })

  it('un lien expiré propose d en demander un nouveau', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Ce lien de réinitialisation est invalide ou a expiré.', 422, {
        token: ['Ce lien de réinitialisation est invalide ou a expiré.'],
      }),
    )
    const { page } = await monter(ReinitialisationView, LIEN)

    await saisirNouveauMotDePasse(page)

    const alerte = page.find('[role="alert"]')
    expect(alerte.text()).toContain('Ce lien de réinitialisation est invalide ou a expiré.')
    expect(alerte.find('a').attributes('href')).toBe('/mot-de-passe-oublie')
  })

  it('une erreur du service est affichée', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Trop de tentatives. Réessayez dans une minute.', 429),
    )
    const { page } = await monter(ReinitialisationView, LIEN)

    await saisirNouveauMotDePasse(page)

    expect(page.find('[role="alert"]').text()).toBe(
      'Trop de tentatives. Réessayez dans une minute.',
    )
  })

  it('un lien incomplet est signalé sans formulaire', async () => {
    const { page } = await monter(ReinitialisationView, '/reinitialiser-mot-de-passe')

    expect(page.find('[role="alert"]').text()).toContain('incomplet')
    expect(page.find('form').exists()).toBe(false)
  })
})

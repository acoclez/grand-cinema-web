import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monter, reponseJeton } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import ConnexionView from '@/views/ConnexionView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('page de connexion', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('un spectateur se connecte et arrive dans son espace', async () => {
    vi.mocked(api.post).mockResolvedValue(reponseJeton())
    const { page, router } = await monter(ConnexionView, '/connexion')

    await page.find('#connexion-email').setValue('camille.durand@exemple.fr')
    await page.find('#connexion-mot-de-passe').setValue('un-mot-de-passe-long')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/connexion', {
      email: 'camille.durand@exemple.fr',
      password: 'un-mot-de-passe-long',
    })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('mon-compte'))
  })

  it('ramène à la page demandée avant la connexion', async () => {
    vi.mocked(api.post).mockResolvedValue(reponseJeton())
    const { page, router } = await monter(
      ConnexionView,
      '/connexion?redirection=%2Fmon-compte%3Fonglet%3Dbillets',
    )

    await page.find('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe('/mon-compte?onglet=billets'),
    )
  })

  it('de mauvais identifiants affichent le message de l API sans changer de page', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Adresse e-mail ou mot de passe incorrect.', 401),
    )
    const { page, router } = await monter(ConnexionView, '/connexion')

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe('Adresse e-mail ou mot de passe incorrect.')
    expect(router.currentRoute.value.name).toBe('connexion')
  })

  it('confirme la modification du mot de passe', async () => {
    const { page } = await monter(ConnexionView, '/connexion?motDePasseModifie=1')

    expect(page.find('[role="status"]').text()).toContain('Votre mot de passe a été modifié')
  })
})

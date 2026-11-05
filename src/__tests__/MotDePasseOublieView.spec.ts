import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monter } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import MotDePasseOublieView from '@/views/MotDePasseOublieView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

const CONFIRMATION =
  "Si un compte existe pour cette adresse, un lien de réinitialisation valable une heure vient d'être envoyé."

describe('page mot de passe oublié', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('la demande affiche la confirmation de l API à la place du formulaire', async () => {
    vi.mocked(api.post).mockResolvedValue({ message: CONFIRMATION })
    const { page } = await monter(MotDePasseOublieView, '/mot-de-passe-oublie')

    await page.find('#oubli-email').setValue('camille.durand@exemple.fr')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/mot-de-passe-oublie', {
      email: 'camille.durand@exemple.fr',
    })
    expect(page.find('[role="status"]').text()).toBe(CONFIRMATION)
    expect(page.find('form').exists()).toBe(false)
  })

  it('les demandes en série affichent le message de blocage', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Trop de tentatives. Réessayez dans une minute.', 429),
    )
    const { page } = await monter(MotDePasseOublieView, '/mot-de-passe-oublie')

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Trop de tentatives. Réessayez dans une minute.',
    )
    expect(page.find('form').exists()).toBe(true)
  })
})

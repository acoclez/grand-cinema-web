import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monter, reponseJeton } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import InscriptionView from '@/views/InscriptionView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('page de création de compte', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('les cases de consentement et des conditions sont décochées par défaut', async () => {
    const { page } = await monter(InscriptionView, '/inscription')

    expect(page.find<HTMLInputElement>('#inscription-consentement').element.checked).toBe(false)
    expect(page.find<HTMLInputElement>('#inscription-conditions').element.checked).toBe(false)
  })

  it('un visiteur crée son compte et arrive dans son espace', async () => {
    vi.mocked(api.post).mockResolvedValue(reponseJeton())
    const { page, router } = await monter(InscriptionView, '/inscription')

    await page.find('#inscription-prenom').setValue('Camille')
    await page.find('#inscription-nom').setValue('Durand')
    await page.find('#inscription-email').setValue('camille.durand@exemple.fr')
    await page.find('#inscription-mot-de-passe').setValue('un-mot-de-passe-long')
    await page.find('#inscription-confirmation').setValue('un-mot-de-passe-long')
    await page.find('#inscription-conditions').setValue(true)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/inscription', {
      prenom: 'Camille',
      nom: 'Durand',
      email: 'camille.durand@exemple.fr',
      password: 'un-mot-de-passe-long',
      password_confirmation: 'un-mot-de-passe-long',
      consentement_emails: false,
      conditions_acceptees: true,
    })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('mon-compte'))
  })

  it('affiche les erreurs de l API sous les champs concernés', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Données invalides.', 422, {
        email: ['Un compte existe déjà avec cette adresse e-mail.'],
        conditions_acceptees: ['Vous devez accepter les conditions générales de vente.'],
      }),
    )
    const { page, router } = await monter(InscriptionView, '/inscription')

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.find('#inscription-email-erreur').text()).toBe(
      'Un compte existe déjà avec cette adresse e-mail.',
    )
    expect(page.find('#inscription-email').attributes('aria-invalid')).toBe('true')
    expect(page.find('#inscription-conditions-erreur').text()).toBe(
      'Vous devez accepter les conditions générales de vente.',
    )
    expect(page.find('[role="alert"]').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('inscription')
  })
})

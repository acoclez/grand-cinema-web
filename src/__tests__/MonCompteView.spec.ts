import { beforeEach, describe, expect, it, vi } from 'vitest'

import { camille, monter, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '@/services/api'
import MonCompteView from '@/views/MonCompteView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('page mon espace', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte()
  })

  it('affiche le profil relu depuis l API', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...camille, consentement_emails: true } })
    const { page } = await monter(MonCompteView, '/mon-compte')

    expect(api.get).toHaveBeenCalledWith('/auth/moi')
    expect(page.text()).toContain('Camille Durand')
    expect(page.text()).toContain('camille.durand@exemple.fr')
    expect(page.find('.profil').text()).toContain('Oui')
  })

  it('un jeton refusé renvoie vers la connexion', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Authentification requise.', 401))
    const { router } = await monter(MonCompteView, '/mon-compte')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
    expect(router.currentRoute.value.query.redirection).toBe('/mon-compte')
  })

  it('un service indisponible est signalé', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0))
    const { page } = await monter(MonCompteView, '/mon-compte')

    expect(page.find('[role="alert"]').text()).toBe(MESSAGE_SERVEUR_INJOIGNABLE)
  })
})

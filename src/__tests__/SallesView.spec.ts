import { beforeEach, describe, expect, it, vi } from 'vitest'

import { administrateur, monter, salleDeTest, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '@/services/api'
import SallesView from '@/views/administration/SallesView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('page des salles', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(administrateur)
  })

  it('affiche chaque salle avec son type, ses places et le total du cinéma', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        salleDeTest({ id: 1, nom: 'Salle 1', type: 'premium_imax', capacite: 300, places: 300 }),
        salleDeTest(),
      ],
      meta: { total_places: 1700 },
    })
    const { page } = await monter(SallesView, '/admin/salles')

    expect(page.find('caption').text()).toMatch(/^2 salles, 1\s700 places au total$/)
    const premiere = page.find('tbody tr')
    expect(premiere.find('th').text()).toBe('Salle 1')
    expect(premiere.text()).toContain('Premium IMAX')
    expect(premiere.text()).toContain('300')
  })

  it('signale une erreur de l API', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0))
    const { page } = await monter(SallesView, '/admin/salles')

    expect(page.find('[role="alert"]').text()).toBe(MESSAGE_SERVEUR_INJOIGNABLE)
    expect(page.find('table').exists()).toBe(false)
  })

  it('une session expirée renvoie vers la connexion', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Authentification requise.', 401))
    const { router } = await monter(SallesView, '/admin/salles')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
  })
})

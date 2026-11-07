import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { administrateur, monter, simulerSessionOuverte } from '@/__tests__/outils'
import App from '@/App.vue'
import { api } from '@/services/api'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('en-tête et accueil', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('un visiteur peut se connecter ou créer un compte', async () => {
    const { page } = await monter(App)

    const liens = page.findAll('nav[aria-label="Compte"] a').map((lien) => lien.text())
    expect(liens).toEqual(['Se connecter', 'Créer un compte'])
    expect(page.find('main').text()).toContain('Créez votre compte')
    expect(page.find('nav[aria-label="Programmation"] a').attributes('href')).toBe('/films')
  })

  it('un compte connecté voit son espace et se déconnecte', async () => {
    simulerSessionOuverte()
    vi.mocked(api.post).mockResolvedValue(undefined)
    const { page, router } = await monter(App, '/mon-compte')
    expect(page.find('main').text()).toContain('Bonjour Camille')

    await page.find('nav button').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/auth/deconnexion')
    expect(router.currentRoute.value.name).toBe('accueil')
    expect(page.findAll('nav a').map((lien) => lien.text())).toContain('Se connecter')
  })

  it('seul l administrateur voit les liens du back-office', async () => {
    simulerSessionOuverte()
    const spectateur = await monter(App)
    expect(spectateur.page.find('nav[aria-label="Back-office"]').exists()).toBe(false)

    simulerSessionOuverte(administrateur)
    const { page } = await monter(App)
    expect(
      page.findAll('nav[aria-label="Back-office"] a').map((lien) => lien.attributes('href')),
    ).toEqual(['/admin/films', '/admin/seances', '/admin/salles'])
  })

  it('l accueil salue un compte connecté', async () => {
    simulerSessionOuverte()
    const { page } = await monter(App)

    expect(page.find('main').text()).toContain('Bonjour Camille, bienvenue au Grand Cinéma.')
  })
})

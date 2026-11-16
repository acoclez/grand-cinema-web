import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filmDeTest, monter } from '@/__tests__/outils'
import { api, ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '@/services/api'
import AlAfficheView from '@/views/AlAfficheView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('page des films à l affiche', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('un visiteur voit les films à l affiche avec leur affiche et leur titre, sans compte', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        filmDeTest({ id: 1, titre: 'Aurore', affiche_url: 'https://images.exemple.fr/aurore.jpg' }),
        filmDeTest({ id: 2, titre: 'Brume' }),
      ],
    })
    const { page } = await monter(AlAfficheView, '/films')

    expect(api.get).toHaveBeenCalledWith('/films')
    const cartes = page.findAll('.carte-film')
    expect(cartes).toHaveLength(2)
    expect(cartes[0]?.find('h2').text()).toBe('Aurore')
    expect(cartes[0]?.find('img').attributes('src')).toBe('https://images.exemple.fr/aurore.jpg')
    expect(cartes[0]?.find('a').attributes('href')).toBe('/films/1')
    expect(cartes[0]?.text()).toContain('Comédie dramatique · 1 h 52 · Tous publics')
  })

  it('un film sans affiche garde sa place, avec un cadre et son titre', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [filmDeTest({ titre: 'Brume' })] })
    const { page } = await monter(AlAfficheView, '/films')

    expect(page.find('img').exists()).toBe(false)
    expect(page.find('.affiche--vide').text()).toBe('Brume')
    expect(page.find('.affiche--vide').attributes('aria-hidden')).toBe('true')
  })

  it('l absence de film est annoncée', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const { page } = await monter(AlAfficheView, '/films')

    expect(page.text()).toContain("Aucun film n'est à l'affiche pour le moment.")
  })

  it('une erreur du service est affichée', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0))
    const { page } = await monter(AlAfficheView, '/films')

    expect(page.find('[role="alert"]').text()).toBe(MESSAGE_SERVEUR_INJOIGNABLE)
  })
})

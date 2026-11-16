import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filmDeTest, monter } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import FicheFilmView from '@/views/FicheFilmView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('fiche d un film', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('affiche le synopsis, la durée, le genre, la classification et la langue', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: filmDeTest({
        id: 4,
        classification: '-12',
        affiche_url: 'https://images.exemple.fr/souffle.jpg',
        bande_annonce_url: 'https://videos.exemple.fr/souffle',
      }),
    })
    const { page } = await monter(FicheFilmView, '/films/4', { id: 4 })

    expect(api.get).toHaveBeenCalledWith('/films/4')
    expect(page.find('h1').text()).toBe('Le Souffle du Festival')
    const infos = page.find('dl').text()
    expect(infos).toContain('Comédie dramatique')
    expect(infos).toContain('1 h 52')
    expect(infos).toContain('-12')
    expect(infos).toContain('Français')
    expect(page.find('.fiche-film__synopsis').text()).toContain('Trois musiciens')
    expect(page.find('img').attributes('alt')).toBe('Affiche du film Le Souffle du Festival')
    const bandeAnnonce = page.find('a[target="_blank"]')
    expect(bandeAnnonce.attributes('href')).toBe('https://videos.exemple.fr/souffle')
    expect(bandeAnnonce.attributes('rel')).toBe('noopener noreferrer')
    expect(document.title).toBe('Le Souffle du Festival – Le Grand Cinéma')
  })

  it('sans bande-annonce ni langue connue, la fiche reste complète', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: filmDeTest({ langue_originale: null }) })
    const { page } = await monter(FicheFilmView, '/films/1', { id: 1 })

    expect(page.find('dl').text()).toContain('Non précisée')
    expect(page.find('a[target="_blank"]').exists()).toBe(false)
  })

  it('un film archivé ou inconnu n est plus à l affiche', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Ressource introuvable.', 404))
    const { page } = await monter(FicheFilmView, '/films/9', { id: 9 })

    expect(page.find('[role="alert"]').text()).toBe('Ce film n’est plus à l’affiche.')
    expect(page.find('article').exists()).toBe(false)
    expect(page.find('.fil-ariane a').attributes('href')).toBe('/films')
  })

  it('une erreur du service est affichée', async () => {
    vi.mocked(api.get).mockRejectedValue(
      new ErreurApi('Une erreur est survenue. Réessayez dans quelques instants.', 500),
    )
    const { page } = await monter(FicheFilmView, '/films/1', { id: 1 })

    expect(page.find('[role="alert"]').text()).toContain('Une erreur est survenue')
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filmDeTest, pageDeFilms } from '@/__tests__/outils'
import { api } from '@/services/api'
import { useGestionFilmsStore } from '@/stores/gestionFilms'
import type { DonneesFilm } from '@/types/film'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('store de gestion des films', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('charge la page demandée, avec ou sans les films archivés', async () => {
    vi.mocked(api.get).mockResolvedValue(pageDeFilms([filmDeTest()], 2, 3))
    const gestion = useGestionFilmsStore()

    gestion.page = 2
    await gestion.chargerListe()
    expect(api.get).toHaveBeenLastCalledWith('/admin/films?page=2')
    expect(gestion.films).toHaveLength(1)
    expect(gestion.dernierePage).toBe(3)

    gestion.avecArchives = true
    await gestion.chargerListe()
    expect(api.get).toHaveBeenLastCalledWith('/admin/films?page=2&archives=1')
  })

  it('revient à la dernière page quand la page affichée n existe plus', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(pageDeFilms([], 3, 2))
      .mockResolvedValueOnce(pageDeFilms([filmDeTest()], 2, 2))
    const gestion = useGestionFilmsStore()

    gestion.page = 3
    await gestion.chargerListe()

    expect(api.get).toHaveBeenLastCalledWith('/admin/films?page=2')
    expect(gestion.page).toBe(2)
    expect(gestion.films).toHaveLength(1)
  })

  it('crée et modifie un film, puis annonce le résultat', async () => {
    const film = filmDeTest()
    const donnees: DonneesFilm = {
      titre: film.titre,
      synopsis: film.synopsis,
      duree_minutes: 112,
      genre: film.genre,
      classification: film.classification,
      langue_originale: 'Français',
      affiche_url: null,
      bande_annonce_url: null,
    }
    vi.mocked(api.post).mockResolvedValue({ data: film })
    vi.mocked(api.put).mockResolvedValue({ data: film })
    const gestion = useGestionFilmsStore()

    await gestion.creer(donnees)
    expect(api.post).toHaveBeenCalledWith('/admin/films', donnees)
    expect(gestion.annonce).toContain('a été ajouté')

    await gestion.modifier(1, donnees)
    expect(api.put).toHaveBeenCalledWith('/admin/films/1', donnees)
    expect(gestion.annonce).toContain('sont enregistrées')
  })

  it('archive puis remet un film à l affiche, et recharge la liste', async () => {
    const film = filmDeTest({ id: 7 })
    vi.mocked(api.post).mockResolvedValue({ data: film })
    vi.mocked(api.get).mockResolvedValue(pageDeFilms([]))
    const gestion = useGestionFilmsStore()

    await gestion.archiver(film)
    expect(api.post).toHaveBeenCalledWith('/admin/films/7/archiver')
    expect(gestion.annonce).toContain('archivé')
    expect(api.get).toHaveBeenCalledTimes(1)

    await gestion.restaurer(film)
    expect(api.post).toHaveBeenCalledWith('/admin/films/7/restaurer')
    expect(gestion.annonce).toContain("de nouveau à l'affiche")
    expect(api.get).toHaveBeenCalledTimes(2)
  })
})

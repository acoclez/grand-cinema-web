import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  administrateur,
  filmDeTest,
  monter,
  pageDeFilms,
  simulerSessionOuverte,
} from '@/__tests__/outils'
import { api, ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '@/services/api'
import FilmsView from '@/views/administration/FilmsView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

const aLAffiche = filmDeTest({ id: 1, titre: 'Aurore' })
const archive = filmDeTest({
  id: 2,
  titre: 'Crépuscule',
  archive: true,
  archive_le: '2026-11-05T10:00:00+00:00',
})

describe('page de gestion des films', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(administrateur)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('liste les films à l affiche avec leur état', async () => {
    vi.mocked(api.get).mockResolvedValue(pageDeFilms([aLAffiche]))
    const { page } = await monter(FilmsView, '/admin/films')

    expect(api.get).toHaveBeenCalledWith('/admin/films?page=1')
    const ligne = page.find('tbody tr')
    expect(ligne.text()).toContain('Aurore')
    expect(ligne.text()).toContain('112 min')
    expect(ligne.text()).toContain("À l'affiche")
    expect(ligne.find('a').attributes('href')).toBe('/admin/films/1/modifier')
  })

  it('affiche aussi les films archivés sur demande', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(pageDeFilms([aLAffiche]))
      .mockResolvedValueOnce(pageDeFilms([aLAffiche, archive]))
    const { page } = await monter(FilmsView, '/admin/films')

    await page.find('#films-archives').setValue(true)
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/admin/films?page=1&archives=1')
    expect(page.findAll('tbody tr')[1]?.text()).toContain('Archivé le 05/11/2026')
  })

  it('archive un film après confirmation et annonce qu il a quitté le site public', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(api.get)
      .mockResolvedValueOnce(pageDeFilms([aLAffiche]))
      .mockResolvedValueOnce(pageDeFilms([]))
    vi.mocked(api.post).mockResolvedValue({ data: { ...aLAffiche, archive: true } })
    const { page } = await monter(FilmsView, '/admin/films')

    await page.find('button[aria-label="Archiver Aurore"]').trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalledOnce()
    expect(api.post).toHaveBeenCalledWith('/admin/films/1/archiver')
    expect(page.find('[role="status"]').text()).toContain("n'apparaît plus sur le site public")
    expect(page.text()).toContain('Aucun film pour le moment.')
  })

  it('n archive rien si l administrateur annule', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(api.get).mockResolvedValue(pageDeFilms([aLAffiche]))
    const { page } = await monter(FilmsView, '/admin/films')

    await page.find('button[aria-label="Archiver Aurore"]').trigger('click')
    await flushPromises()

    expect(api.post).not.toHaveBeenCalled()
  })

  it('remet un film archivé à l affiche', async () => {
    vi.mocked(api.get).mockResolvedValue(pageDeFilms([archive]))
    vi.mocked(api.post).mockResolvedValue({ data: { ...archive, archive: false } })
    const { page } = await monter(FilmsView, '/admin/films')

    await page.find('button[aria-label="Remettre Crépuscule à l\'affiche"]').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/films/2/restaurer')
    expect(page.find('[role="status"]').text()).toContain("de nouveau à l'affiche")
  })

  it('passe d une page à l autre', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(pageDeFilms([aLAffiche], 1, 2))
      .mockResolvedValueOnce(pageDeFilms([archive], 2, 2))
    const { page } = await monter(FilmsView, '/admin/films')
    expect(page.find('.pagination').text()).toContain('Page 1 sur 2')

    const suivante = page.findAll('.pagination button')[1]
    await suivante?.trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/admin/films?page=2')
    expect(page.find('.pagination').text()).toContain('Page 2 sur 2')
  })

  it('signale une erreur de l API', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0))
    const { page } = await monter(FilmsView, '/admin/films')

    expect(page.find('[role="alert"]').text()).toBe(MESSAGE_SERVEUR_INJOIGNABLE)
    expect(page.find('table').exists()).toBe(false)
  })

  it('une session expirée renvoie vers la connexion', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Authentification requise.', 401))
    const { router } = await monter(FilmsView, '/admin/films')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('connexion'))
    expect(router.currentRoute.value.query.redirection).toBe('/admin/films')
  })
})

import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { administrateur, filmDeTest, monter, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { useGestionFilmsStore } from '@/stores/gestionFilms'
import FilmFormulaireView from '@/views/administration/FilmFormulaireView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

describe('formulaire de film', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(administrateur)
  })

  it('l administrateur ajoute un film qui rejoint la liste', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: filmDeTest() })
    const { page, router } = await monter(FilmFormulaireView, '/admin/films/nouveau')
    expect(page.find('h1').text()).toBe('Ajouter un film')

    await page.find('#film-titre').setValue('Le Souffle du Festival')
    await page.find('#film-synopsis').setValue('Trois musiciens traversent la ville.')
    await page.find('#film-duree').setValue(' 112 ')
    await page.find('#film-genre').setValue('Comédie dramatique')
    await page.find('#film-classification').setValue('-12')
    await page.find('#film-langue').setValue('Français')
    await page.find('#film-affiche').setValue('https://images.exemple.fr/souffle.jpg')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/films', {
      titre: 'Le Souffle du Festival',
      synopsis: 'Trois musiciens traversent la ville.',
      duree_minutes: 112,
      genre: 'Comédie dramatique',
      classification: '-12',
      langue_originale: 'Français',
      affiche_url: 'https://images.exemple.fr/souffle.jpg',
      bande_annonce_url: null,
    })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('admin-films'))
    expect(useGestionFilmsStore().annonce).toContain('a été ajouté')
  })

  it('l affiche et la bande-annonce sont facultatives, les autres champs obligatoires', async () => {
    const { page } = await monter(FilmFormulaireView, '/admin/films/nouveau')

    expect(page.find('#film-titre').attributes('required')).toBeDefined()
    expect(page.find('#film-synopsis').attributes('required')).toBeDefined()
    expect(page.find('#film-classification').attributes('required')).toBeDefined()
    expect(page.find('#film-affiche').attributes('required')).toBeUndefined()
    expect(page.find('label[for="film-affiche"]').text()).toContain('(facultatif)')
  })

  it('un champ obligatoire manquant est signalé sous le champ et rien n est enregistré', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Le champ titre est obligatoire.', 422, {
        titre: ['Le champ titre est obligatoire.'],
        duree_minutes: ['Le champ durée est obligatoire.'],
      }),
    )
    const { page, router } = await monter(FilmFormulaireView, '/admin/films/nouveau')

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith(
      '/admin/films',
      expect.objectContaining({ titre: '', duree_minutes: null, affiche_url: null }),
    )
    expect(page.find('#film-titre-erreur').text()).toBe('Le champ titre est obligatoire.')
    expect(page.find('#film-titre').attributes('aria-invalid')).toBe('true')
    expect(page.find('#film-duree-erreur').text()).toBe('Le champ durée est obligatoire.')
    expect(page.find('[role="alert"]').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('admin-film-nouveau')
  })

  it('l administrateur modifie un film existant', async () => {
    const film = filmDeTest({ id: 4, affiche_url: 'https://images.exemple.fr/a.jpg' })
    vi.mocked(api.get).mockResolvedValue({ data: film })
    vi.mocked(api.put).mockResolvedValue({ data: { ...film, genre: 'Drame' } })
    const { page, router } = await monter(FilmFormulaireView, '/admin/films/4/modifier', {
      id: 4,
    })

    expect(api.get).toHaveBeenCalledWith('/admin/films/4')
    expect(page.find('h1').text()).toBe('Modifier un film')
    expect(page.find<HTMLInputElement>('#film-titre').element.value).toBe(film.titre)
    expect(page.find<HTMLInputElement>('#film-duree').element.value).toBe('112')

    await page.find('#film-genre').setValue('Drame')
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith(
      '/admin/films/4',
      expect.objectContaining({
        genre: 'Drame',
        duree_minutes: 112,
        affiche_url: 'https://images.exemple.fr/a.jpg',
      }),
    )
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('admin-films'))
  })

  it('un film inconnu est signalé avec un lien vers la liste', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Ressource introuvable.', 404))
    const { page } = await monter(FilmFormulaireView, '/admin/films/99/modifier', { id: 99 })

    const alerte = page.find('[role="alert"]')
    expect(alerte.text()).toContain('Ce film n’existe pas.')
    expect(alerte.find('a').attributes('href')).toBe('/admin/films')
    expect(page.find('form').exists()).toBe(false)
  })

  it('une erreur du service à l enregistrement est affichée', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Trop de tentatives. Réessayez dans une minute.', 429),
    )
    const { page } = await monter(FilmFormulaireView, '/admin/films/nouveau')

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Trop de tentatives. Réessayez dans une minute.',
    )
  })
})

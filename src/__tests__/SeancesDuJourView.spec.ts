import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { monter, seancePubliqueDeTest } from '@/__tests__/outils'
import { api, ErreurApi, MESSAGE_SERVEUR_INJOIGNABLE } from '@/services/api'
import SeancesDuJourView from '@/views/SeancesDuJourView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

const aurore = { ...seancePubliqueDeTest().film, id: 2, titre: 'Aurore' }

describe('page des séances', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    // Les tests se déroulent le jeudi 12 novembre 2026 à 10 h.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('un visiteur voit les séances du jour par film, avec l heure, la salle et la langue', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        seancePubliqueDeTest({ id: 1, debut: '2026-11-12T14:00:00+01:00', langue: 'vo' }),
        seancePubliqueDeTest({ id: 2, film: aurore, debut: '2026-11-12T17:30:00+01:00' }),
        seancePubliqueDeTest({
          id: 3,
          salle: { nom: 'Salle 1', type: 'premium_imax' },
          debut: '2026-11-12T20:30:00+01:00',
        }),
      ],
    })
    const { page } = await monter(SeancesDuJourView, '/seances')

    expect(api.get).toHaveBeenCalledWith('/seances?date=2026-11-12')
    expect(page.find('.seances__jour').text()).toBe('Séances du jeudi 12 novembre 2026')
    const films = page.findAll('.seances-film')
    expect(films.map((film) => film.find('h2').text())).toEqual([
      'Aurore',
      'Le Souffle du Festival',
    ])
    expect(films[1]?.find('h2 a').attributes('href')).toBe('/films/1')
    const horaires = films[1]?.findAll('.horaire') ?? []
    expect(horaires.map((horaire) => horaire.find('.horaire__heure').text())).toEqual([
      '14:00',
      '20:30',
    ])
    expect(horaires[0]?.find('.horaire__version').text()).toBe('VO')
    expect(horaires[0]?.find('.horaire__salle').text()).toBe('Salle 3 · Standard')
    expect(horaires[1]?.find('.horaire__salle').text()).toBe('Salle 1 · Premium IMAX')
  })

  it('chaque séance affiche ses places restantes, Bientôt complet ou Complet', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        seancePubliqueDeTest({ id: 1, places_restantes: 120 }),
        seancePubliqueDeTest({ id: 2, places_restantes: 1, bientot_complet: true }),
        seancePubliqueDeTest({ id: 3, places_restantes: 0, complet: true }),
      ],
    })
    const { page } = await monter(SeancesDuJourView, '/seances')

    const [libre, bientot, complet] = page.findAll('.horaire')
    expect(libre?.find('.horaire__places').text()).toBe('120 places restantes')
    expect(libre?.find('.remplissage').exists()).toBe(false)
    expect(bientot?.find('.horaire__places').text()).toBe('1 place restante')
    expect(bientot?.find('.remplissage--bientot').text()).toBe('Bientôt complet')
    expect(complet?.classes()).toContain('horaire--complet')
    expect(complet?.find('.remplissage--complet').text()).toBe('Complet')
    expect(complet?.find('.horaire__places').exists()).toBe(false)
  })

  it('chaque séance non complète mène à son plan de salle pour choisir ses places', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        seancePubliqueDeTest({ id: 4 }),
        seancePubliqueDeTest({ id: 5, places_restantes: 0, complet: true }),
      ],
    })
    const { page } = await monter(SeancesDuJourView, '/seances')

    const [libre, complet] = page.findAll('.horaire')
    const lien = libre?.find('.horaire__reserver')
    expect(lien?.text()).toBe('Choisir ses places')
    expect(lien?.attributes('href')).toBe('/seances/4/places')
    expect(lien?.attributes('aria-label')).toBe(
      'Choisir ses places pour Le Souffle du Festival à 20:30, Salle 3',
    )
    expect(complet?.find('.horaire__reserver').exists()).toBe(false)
  })

  it('changer de date recharge les séances, sans revenir avant aujourd hui', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const { page } = await monter(SeancesDuJourView, '/seances')
    const [precedent, suivant] = page.findAll('.filtres__jours button')

    expect(precedent?.attributes('disabled')).toBeDefined()
    expect(page.find('input[type="date"]').attributes('min')).toBe('2026-11-12')

    await suivant?.trigger('click')
    expect(api.get).toHaveBeenLastCalledWith('/seances?date=2026-11-13')
    expect(precedent?.attributes('disabled')).toBeUndefined()

    await page.find('input[type="date"]').setValue('2026-11-20')
    expect(api.get).toHaveBeenLastCalledWith('/seances?date=2026-11-20')

    await page.find('input[type="date"]').setValue('')
    expect(api.get).toHaveBeenLastCalledWith('/seances?date=2026-11-12')
  })

  it('l absence de séance est annoncée avec la date', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const { page } = await monter(SeancesDuJourView, '/seances')

    expect(page.text()).toContain("Aucune séance n'est programmée le jeudi 12 novembre 2026.")
  })

  it('une erreur du service est affichée', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi(MESSAGE_SERVEUR_INJOIGNABLE, 0))
    const { page } = await monter(SeancesDuJourView, '/seances')

    expect(page.find('[role="alert"]').text()).toBe(MESSAGE_SERVEUR_INJOIGNABLE)
  })
})

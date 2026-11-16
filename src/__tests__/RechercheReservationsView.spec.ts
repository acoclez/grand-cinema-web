import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  agent,
  monter,
  seancePubliqueDeTest,
  simulerSessionOuverte,
  texte,
} from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import type { ListePaginee } from '@/types/pagination'
import type { ReservationTrouvee } from '@/types/reservation'
import RechercheReservationsView from '@/views/RechercheReservationsView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

/** Réservation payée en ligne par Camille Durand, places B1 et B2. */
function trouvee(changements: Partial<ReservationTrouvee> = {}): ReservationTrouvee {
  return {
    id: 7,
    numero: 'R-7KX4M2PA',
    statut: 'confirmee',
    canal: 'en_ligne',
    client: { prenom: 'Camille', nom: 'Durand', email: 'camille.durand@exemple.fr' },
    seance: {
      id: 1,
      film: { id: 1, titre: 'Le Souffle du Festival' },
      salle: { nom: 'Salle 9' },
      debut: '2026-11-12T20:30:00+01:00',
    },
    places: 2,
    montant_centimes: 1650,
    paiement: 'accepte',
    ...changements,
  }
}

function page(
  resultats: ReservationTrouvee[],
  numero = 1,
  derniere = 1,
): ListePaginee<ReservationTrouvee> {
  return {
    data: resultats,
    meta: { current_page: numero, last_page: derniere, per_page: 20, total: resultats.length },
  }
}

/** La page lit d'abord les séances du jour, puis les résultats de chaque recherche. */
async function monterLaRecherche(...reponses: ListePaginee<ReservationTrouvee>[]) {
  const appels = vi.mocked(api.get).mockResolvedValueOnce({
    data: [
      seancePubliqueDeTest({ id: 1 }),
      seancePubliqueDeTest({ id: 2, debut: '2026-11-12T14:00:00+01:00' }),
    ],
  })
  for (const reponse of reponses) {
    appels.mockResolvedValueOnce(reponse)
  }
  return monter(RechercheReservationsView, '/guichet/reservations')
}

describe('recherche d une réservation au guichet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(agent)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('un nom affiche les réservations correspondantes avec leur statut', async () => {
    const { page: vue } = await monterLaRecherche(
      page([
        trouvee(),
        trouvee({
          id: 8,
          numero: 'R-QWERTY23',
          statut: 'en_attente',
          client: { prenom: 'Paul', nom: 'Durand', email: 'paul.durand@exemple.fr' },
          places: 1,
          montant_centimes: 0,
          paiement: null,
        }),
      ]),
    )
    expect(api.get).toHaveBeenCalledWith('/seances?date=2026-11-12')

    await vue.find('#recherche-texte').setValue('  Durand ')
    await vue.find('form').trigger('submit')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/guichet/reservations?page=1&recherche=Durand')
    expect(vue.find('caption').text()).toBe('2 réservations trouvées')
    const lignes = vue.findAll('tbody tr').map((ligne) => ligne.findAll('th, td').map(texte))
    expect(lignes[0]).toEqual([
      'R-7KX4M2PA',
      'Camille Durand',
      'Le Souffle du Festivaljeudi 12 novembre 2026 à 20:30, Salle 9',
      '2',
      '16,50 €',
      'Confirmée',
    ])
    // La séance tient sur deux lignes: le film, puis le jour, l'heure et la salle.
    expect(texte(vue.find('tbody .tableau__detail'))).toBe(
      'jeudi 12 novembre 2026 à 20:30, Salle 9',
    )
    expect(lignes[1]?.[5]).toBe('En attente de paiement')
    expect(vue.find('tbody a').attributes('href')).toBe('/guichet/reservations/7')
  })

  it('une séance liste ses réservations, au guichet comme en ligne', async () => {
    const { page: vue } = await monterLaRecherche(
      page([
        trouvee({ id: 9, numero: 'R-GUICHET2', canal: 'guichet', client: null, paiement: null }),
      ]),
    )
    const options = vue.findAll('#recherche-seance option').map((option) => option.text())
    expect(options).toEqual([
      'Toutes les séances',
      '20:30 · Le Souffle du Festival · Salle 3',
      '14:00 · Le Souffle du Festival · Salle 3',
    ])

    await vue.find('#recherche-seance').setValue(2)
    await vue.find('form').trigger('submit')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/guichet/reservations?page=1&seance=2')
    expect(texte(vue.find('tbody td'))).toBe('Vente au guichet')
  })

  it('changer de jour propose les séances de ce jour', async () => {
    const { page: vue } = await monterLaRecherche()
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] })

    await vue.find('#recherche-jour').setValue('2026-11-13')
    await vue.find('#recherche-jour').trigger('change')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/seances?date=2026-11-13')
    expect(vue.findAll('#recherche-seance option')).toHaveLength(1)
  })

  it('sans critère, la recherche n est pas lancée', async () => {
    const { page: vue } = await monterLaRecherche()

    await vue.find('form').trigger('submit')
    await flushPromises()

    expect(api.get).toHaveBeenCalledOnce()
    expect(vue.find('[role="alert"]').text()).toBe(
      'Saisissez un numéro de réservation, un nom ou une adresse e-mail, ou choisissez une séance.',
    )
  })

  it('une recherche sans résultat le dit', async () => {
    const { page: vue } = await monterLaRecherche(page([]))

    await vue.find('#recherche-texte').setValue('R-ZZZZ')
    await vue.find('form').trigger('submit')
    await flushPromises()

    expect(vue.find('[role="status"]').text()).toBe(
      'Aucune réservation ne correspond à cette recherche.',
    )
  })

  it('les résultats se parcourent page par page', async () => {
    const { page: vue } = await monterLaRecherche(
      page([trouvee()], 1, 2),
      page([trouvee({ id: 30, numero: 'R-SUITE234' })], 2, 2),
    )
    await vue.find('#recherche-texte').setValue('Durand')
    await vue.find('form').trigger('submit')
    await flushPromises()

    expect(vue.find('.pagination span').text()).toBe('Page 1 sur 2')
    await vue.findAll('.pagination button')[1]!.trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/guichet/reservations?page=2&recherche=Durand')
    expect(vue.find('tbody a').text()).toBe('R-SUITE234')
  })

  it('une erreur de l API est affichée', async () => {
    const { page: vue } = await monterLaRecherche()
    vi.mocked(api.get).mockRejectedValueOnce(
      new ErreurApi('Le champ recherche est trop court.', 422),
    )

    await vue.find('#recherche-texte').setValue('R')
    await vue.find('form').trigger('submit')
    await flushPromises()

    expect(vue.find('[role="alert"]').text()).toBe('Le champ recherche est trop court.')
  })

  it('la recherche est réservée aux agents et à l administrateur', async () => {
    simulerSessionOuverte()
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const { router } = await monter(RechercheReservationsView, '/guichet/reservations')

    expect(router.currentRoute.value.name).toBe('accueil')
  })
})

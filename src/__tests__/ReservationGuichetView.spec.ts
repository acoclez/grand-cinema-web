import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agent, monter, reservationDeTest, simulerSessionOuverte, texte } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import type { ReservationAuGuichet } from '@/types/reservation'
import ReservationGuichetView from '@/views/ReservationGuichetView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

/** Réservation payée en ligne par Camille Durand: B1 Plein déjà passé en salle, B2 Réduit (PMR). */
function payee(changements: Partial<ReservationAuGuichet> = {}): ReservationAuGuichet {
  return {
    ...reservationDeTest({
      statut: 'confirmee',
      montant_centimes: 1650,
      expire_at: null,
      secondes_restantes: 0,
      paiement: 'accepte',
      places: [
        {
          id: 21,
          rangee: 'B',
          numero: 1,
          pmr: false,
          tarif: 'Plein',
          prix_centimes: 950,
          utilise_at: '2026-11-12T20:12:00+01:00',
        },
        {
          id: 22,
          rangee: 'B',
          numero: 2,
          pmr: true,
          tarif: 'Réduit',
          prix_centimes: 700,
          utilise_at: null,
        },
      ],
    }),
    client: { prenom: 'Camille', nom: 'Durand', email: 'camille.durand@exemple.fr' },
    ...changements,
  }
}

async function monterLeDetail(reservation: ReservationAuGuichet) {
  vi.mocked(api.get).mockResolvedValue({ data: reservation })
  return monter(ReservationGuichetView, '/guichet/reservations/7', { id: 7 })
}

/** Libellés et valeurs de la fiche, par exemple ['Statut', 'Confirmée']. */
function fiche(page: Awaited<ReturnType<typeof monterLeDetail>>['page']): string[][] {
  const libelles = page.findAll('dl dt').map(texte)
  const valeurs = page.findAll('dl dd').map(texte)
  return libelles.map((libelle, rang) => [libelle, valeurs[rang] ?? ''])
}

describe('détail d une réservation au guichet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(agent)
  })

  it('l agent voit le client, la séance, le paiement et le montant', async () => {
    const { page } = await monterLeDetail(payee())

    expect(api.get).toHaveBeenCalledWith('/guichet/reservations/7')
    expect(page.find('h1').text()).toBe('Réservation R-7KX4M2PA')
    expect(fiche(page)).toEqual([
      ['Statut', 'Confirmée'],
      ['Client', 'Camille Durand, camille.durand@exemple.fr'],
      ['Vente', 'En ligne'],
      ['Séance', 'Le Souffle du Festival, jeudi 12 novembre 2026 à 20:30, Salle 9, VO'],
      ['Paiement', 'Accepté (Stripe)'],
      ['Montant', '16,50 €'],
    ])
    expect(page.find('.fil-ariane a').attributes('href')).toBe('/guichet/reservations')
  })

  it('chaque place montre son tarif, son prix et l état de son billet', async () => {
    const { page } = await monterLeDetail(payee())

    const lignes = page.findAll('tbody tr').map((ligne) => ligne.findAll('th, td').map(texte))
    expect(lignes).toEqual([
      ['B1', 'Plein', '9,50 €', 'Utilisé à 20:12'],
      ['B2 (PMR)', 'Réduit', '7,00 €', 'Non utilisé'],
    ])
  })

  it('une vente au guichet n a ni compte client ni paiement en ligne', async () => {
    const { page } = await monterLeDetail(payee({ canal: 'guichet', client: null, paiement: null }))

    expect(fiche(page)).toContainEqual(['Client', 'Vente au guichet'])
    expect(fiche(page)).toContainEqual(['Vente', 'Guichet'])
    expect(fiche(page)).toContainEqual(['Paiement', 'Encaissé au guichet'])
  })

  it('une réservation expirée n a plus de billet', async () => {
    const { page } = await monterLeDetail(
      payee({ statut: 'expiree', paiement: 'rembourse', places: [], client: null }),
    )

    expect(fiche(page)).toContainEqual(['Statut', 'Expirée'])
    expect(fiche(page)).toContainEqual(['Client', 'Compte supprimé'])
    expect(fiche(page)).toContainEqual(['Paiement', 'Remboursé'])
    expect(page.find('table').exists()).toBe(false)
    expect(page.find('.message').text()).toBe(
      'Les places de cette réservation ont été libérées: aucun billet.',
    )
  })

  it('une réservation introuvable est annoncée', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Introuvable.', 404))
    const { page } = await monter(ReservationGuichetView, '/guichet/reservations/99', { id: 99 })

    expect(page.find('[role="alert"]').text()).toBe('Cette réservation est introuvable.')
  })
})

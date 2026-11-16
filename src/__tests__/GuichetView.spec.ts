import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  agent,
  monter,
  planAvecOccupees,
  planDeTest,
  reservationDeTest,
  simulerSessionOuverte,
  texte,
} from '@/__tests__/outils'
import { ACTUALISATION_PLAN_MS } from '@/composables/usePlanDeSalle'
import { api, ErreurApi } from '@/services/api'
import GuichetView from '@/views/GuichetView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

async function monterLeGuichet() {
  return monter(GuichetView, '/guichet/seances/1', { id: 1 })
}

describe('vente au guichet', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    // Les tests se déroulent le jeudi 12 novembre 2026 à 10 h.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10, 0))
    simulerSessionOuverte(agent)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('l agent voit le même plan que le site, avec les places occupées', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const { page } = await monterLeGuichet()

    expect(api.get).toHaveBeenCalledWith('/seances/1/plan')
    expect(page.find('h1').text()).toBe('Le Souffle du Festival')
    expect(page.find('.plan-seance').text()).toBe(
      'jeudi 12 novembre 2026 à 20:30 · Salle 9 · Événementielle · VO',
    )
    expect(page.find('.plan-libres').text()).toBe('5 places libres sur 6')
    expect(page.find('[aria-label="Place A2, occupée"]').attributes('disabled')).toBeDefined()
    expect(page.find('.selection__resume').text()).toBe('Aucune place choisie.')
    expect(page.find('.panier .bouton').attributes('disabled')).toBeDefined()
  })

  it('l agent choisit les places et leur tarif, puis encaisse: les places sont vendues', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: planDeTest() })
      .mockResolvedValue({ data: planAvecOccupees(21, 22) })
    vi.mocked(api.post).mockResolvedValue({
      data: reservationDeTest({
        numero: 'R-GUICHET2',
        statut: 'confirmee',
        canal: 'guichet',
        montant_centimes: 1650,
        expire_at: null,
        secondes_restantes: 0,
        places: [
          {
            id: 21,
            rangee: 'B',
            numero: 1,
            pmr: false,
            tarif: 'Plein',
            prix_centimes: 950,
            utilise_at: null,
          },
          {
            id: 22,
            rangee: 'B',
            numero: 2,
            pmr: false,
            tarif: 'Réduit',
            prix_centimes: 700,
            utilise_at: null,
          },
        ],
      }),
    })
    const { page } = await monterLeGuichet()

    await page.find('[aria-label="Place B1, libre"]').trigger('click')
    await page.find('[aria-label="Place B2, libre"]').trigger('click')
    const tarifs = page.findAll('.panier__place')
    expect(tarifs.map((ligne) => ligne.find('label').text())).toEqual(['Place B1', 'Place B2'])
    expect(tarifs[0]?.findAll('option').map(texte)).toEqual(['Plein · 9,50 €', 'Réduit · 7,00 €'])
    expect(texte(page.find('.panier__total'))).toBe('Total: 19,00 €')

    await page.find('#tarif-22').setValue('6')
    expect(texte(page.find('.panier__total'))).toBe('Total: 16,50 €')
    const bouton = page.find('.panier .bouton')
    expect(texte(bouton)).toBe('Encaisser 16,50 €')

    await bouton.trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/guichet/seances/1/ventes', {
      billets: [
        { place_id: 21, tarif_id: 5 },
        { place_id: 22, tarif_id: 6 },
      ],
    })
    expect(texte(page.find('.guichet__confirmation'))).toBe(
      'Vente R-GUICHET2 encaissée: B1, B2, 16,50 €.',
    )
    // Le plan est relu aussitôt: les places vendues sont occupées et la vente suivante commence.
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(page.find('[aria-label="Place B1, occupée"]').exists()).toBe(true)
    expect(page.find('.selection__resume').text()).toBe('Aucune place choisie.')
  })

  it('une place qui vient d être prise en ligne n est pas vendue et le plan est relu', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: planDeTest() })
      .mockResolvedValue({ data: planAvecOccupees(21) })
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Ces places viennent d’être prises: B1. Choisissez-en d’autres.', 409),
    )
    const { page } = await monterLeGuichet()

    await page.find('[aria-label="Place B1, libre"]').trigger('click')
    await page.find('[aria-label="Place B2, libre"]').trigger('click')
    await page.find('.panier .bouton').trigger('click')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Ces places viennent d’être prises: B1. Choisissez-en d’autres.',
    )
    expect(page.find('[aria-label="Place B1, occupée"]').exists()).toBe(true)
    expect(page.findAll('.panier__place').map((ligne) => ligne.find('label').text())).toEqual([
      'Place B2',
    ])
    expect(page.find('.guichet__confirmation').exists()).toBe(false)
  })

  it('le plan relu toutes les 5 secondes retire une place prise en ligne entre-temps', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: planDeTest() })
      .mockResolvedValue({ data: planAvecOccupees(23) })
    const { page } = await monterLeGuichet()
    await page.find('[aria-label="Place B3, libre"]').trigger('click')

    await vi.advanceTimersByTimeAsync(ACTUALISATION_PLAN_MS)
    await flushPromises()

    expect(page.find('.plan-annonce').text()).toBe(
      'La place B3 vient d’être prise: choisissez-en une autre.',
    )
    expect(page.find('.selection__resume').text()).toBe('Aucune place choisie.')
  })

  it('une séance commencée se consulte sans vente possible', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest({ reservable: false }) })
    const { page } = await monterLeGuichet()

    expect(page.find('.message--erreur').text()).toBe(
      'Cette séance a commencé: ses places ne se vendent plus.',
    )
    expect(page.find('[aria-label="Place B1, libre"]').attributes('disabled')).toBeDefined()
    expect(page.find('.panier').exists()).toBe(false)
  })

  it('un spectateur qui ouvre le guichet est renvoyé à l accueil', async () => {
    simulerSessionOuverte()
    const { router } = await monterLeGuichet()

    expect(router.currentRoute.value.name).toBe('accueil')
  })
})

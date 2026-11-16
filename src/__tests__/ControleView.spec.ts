import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { agent, monter, planDeTest, simulerSessionOuverte } from '@/__tests__/outils'
import { api, ErreurApi } from '@/services/api'
import { demarrerLecteur, lireImage, type Lecteur } from '@/services/lecteurQr'
import type { ControleBillet } from '@/types/controle'
import ControleView from '@/views/ControleView.vue'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))
vi.mock('@/services/lecteurQr', () => ({
  DELAI_MEME_CODE_MS: 10_000,
  demarrerLecteur:
    vi.fn<(video: HTMLVideoElement, surCode: (code: string) => void) => Promise<Lecteur>>(),
  lireImage: vi.fn<(image: File) => Promise<string>>(),
}))

const billetB7: NonNullable<ControleBillet['billet']> = {
  film: 'Le Souffle du Festival',
  salle: 'Salle 9',
  debut: '2026-11-12T20:30:00+01:00',
  place: { rangee: 'B', numero: 7, pmr: false },
  tarif: 'Réduit',
  utilise_at: '2026-11-12T20:10:00+01:00',
}

const valide: ControleBillet = { resultat: 'valide', message: 'Valide', billet: billetB7 }

/** Code lu par la caméra simulée, et l'arrêt de la caméra. */
let lire: (code: string) => void = () => undefined
const arreter = vi.fn<() => void>()

async function monterLeControle() {
  vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
  vi.mocked(demarrerLecteur).mockImplementation(async (_video, surCode) => {
    lire = surCode
    return { arreter }
  })
  return monter(ControleView, '/controle/seances/1', { id: 1 })
}

async function scannerAvecLaCamera(page: Awaited<ReturnType<typeof monterLeControle>>['page']) {
  await page.find('button.bouton').trigger('click')
  await flushPromises()
}

describe('contrôle des billets à l entrée', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    simulerSessionOuverte(agent)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 20, 10))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('l agent voit la séance contrôlée et la consigne', async () => {
    const { page } = await monterLeControle()

    expect(api.get).toHaveBeenCalledWith('/seances/1/plan')
    expect(page.find('h1').text()).toBe('Le Souffle du Festival')
    expect(page.find('h2').text()).toBe('Contrôle des billets')
    expect(page.find('.controle__consigne').text()).toBe(
      'Scannez le QR code d’un billet: le résultat s’affiche ici.',
    )
    expect(page.find('.controle__camera--active').exists()).toBe(false)
  })

  it('un billet valide affiche Valide avec le film, la salle et la place', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: valide })
    const { page } = await monterLeControle()

    await scannerAvecLaCamera(page)
    expect(page.find('.controle__camera--active').exists()).toBe(true)
    lire('jeton-du-billet')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/controle/seances/1/billets', {
      code: 'jeton-du-billet',
    })
    const resultat = page.find('.resultat-controle--valide')
    expect(resultat.find('.resultat-controle__titre').text()).toBe('Valide')
    expect(resultat.findAll('dd').map((valeur) => valeur.text())).toEqual([
      'Le Souffle du Festival',
      'Salle 9',
      'B7',
      'Réduit',
    ])
    expect(resultat.find('.resultat-controle__message').exists()).toBe(false)
  })

  it('le billet resté devant la caméra n est pas recontrôlé tout de suite', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: valide })
    const { page } = await monterLeControle()
    await scannerAvecLaCamera(page)

    lire('jeton-du-billet')
    await flushPromises()
    vi.setSystemTime(new Date(2026, 10, 12, 20, 10, 5))
    lire('jeton-du-billet')
    await flushPromises()
    expect(api.post).toHaveBeenCalledOnce()
    expect(page.find('.resultat-controle__titre').text()).toBe('Valide')

    lire('autre-billet')
    await flushPromises()
    vi.setSystemTime(new Date(2026, 10, 12, 20, 10, 20))
    lire('jeton-du-billet')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(3)
  })

  it('un billet déjà utilisé affiche l heure du premier passage', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        resultat: 'deja_utilise',
        message: 'Déjà utilisé: premier passage à 20:10.',
        billet: { ...billetB7, place: { rangee: 'B', numero: 7, pmr: true } },
      },
    })
    const { page } = await monterLeControle()
    await scannerAvecLaCamera(page)

    lire('jeton-du-billet')
    await flushPromises()

    const resultat = page.find('.resultat-controle--deja_utilise')
    expect(resultat.find('.resultat-controle__titre').text()).toBe('Déjà utilisé')
    expect(resultat.find('.resultat-controle__message').text()).toBe(
      'Déjà utilisé: premier passage à 20:10.',
    )
    expect(resultat.findAll('dd')[2]?.text()).toBe('B7 (PMR)')
  })

  it('un QR code inconnu ou d une autre séance affiche Invalide', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        resultat: 'invalide',
        message: 'Invalide: QR code inconnu ou billet non payé.',
        billet: null,
      },
    })
    const { page } = await monterLeControle()
    await scannerAvecLaCamera(page)

    lire('code-inconnu')
    await flushPromises()

    const resultat = page.find('.resultat-controle--invalide')
    expect(resultat.find('.resultat-controle__titre').text()).toBe('Invalide')
    expect(resultat.find('.resultat-controle__message').text()).toBe(
      'Invalide: QR code inconnu ou billet non payé.',
    )
    expect(resultat.find('dl').exists()).toBe(false)
  })

  it('sans caméra, l agent est invité à scanner une photo du QR code', async () => {
    const { page } = await monterLeControle()
    vi.mocked(demarrerLecteur).mockRejectedValue(new Error('NotAllowedError'))

    await scannerAvecLaCamera(page)

    expect(page.find('[role="alert"]').text()).toBe(
      'La caméra est indisponible: autorisez son accès dans le navigateur, ou scannez une photo du QR code.',
    )
    expect(page.find('button.bouton').attributes('disabled')).toBeUndefined()
  })

  it('le QR code d une photo est contrôlé, même s il vient d être lu', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: valide })
    vi.mocked(lireImage).mockResolvedValue('jeton-du-billet')
    const { page } = await monterLeControle()
    const photo = new File(['image'], 'billet.jpg', { type: 'image/jpeg' })
    const champ = page.find('input[type="file"]')
    expect(champ.attributes('capture')).toBe('environment')
    Object.defineProperty(champ.element, 'files', { value: [photo] })

    await champ.trigger('change')
    await flushPromises()
    await champ.trigger('change')
    await flushPromises()

    expect(lireImage).toHaveBeenCalledWith(photo)
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(page.find('.resultat-controle__titre').text()).toBe('Valide')
  })

  it('une photo sans QR code lisible est signalée', async () => {
    vi.mocked(lireImage).mockRejectedValue(new Error('No QR code found'))
    const { page } = await monterLeControle()
    const champ = page.find('input[type="file"]')
    Object.defineProperty(champ.element, 'files', { value: [new File(['x'], 'flou.jpg')] })

    await champ.trigger('change')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Aucun QR code lisible sur cette photo: reprenez-la de plus près.',
    )
    expect(api.post).not.toHaveBeenCalled()
  })

  it('la caméra s arrête sur demande et en quittant la page', async () => {
    const { page } = await monterLeControle()
    await scannerAvecLaCamera(page)

    await page.find('.actions button.bouton-lien').trigger('click')
    expect(arreter).toHaveBeenCalledOnce()
    expect(page.find('.controle__camera--active').exists()).toBe(false)

    await scannerAvecLaCamera(page)
    page.unmount()
    expect(arreter).toHaveBeenCalledTimes(2)
  })

  it('un refus de l API, par exemple hors du jour de la séance, est affiché', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ErreurApi('Le contrôle des billets n’est ouvert que le jour de la séance.', 409),
    )
    const { page } = await monterLeControle()
    await scannerAvecLaCamera(page)

    lire('jeton-du-billet')
    await flushPromises()

    expect(page.find('[role="alert"]').text()).toBe(
      'Le contrôle des billets n’est ouvert que le jour de la séance.',
    )
  })

  it('une séance non publiée n est pas contrôlée', async () => {
    vi.mocked(api.get).mockRejectedValue(new ErreurApi('Introuvable.', 404))
    const { page } = await monter(ControleView, '/controle/seances/1', { id: 1 })

    expect(page.find('[role="alert"]').text()).toBe('Cette séance n’est pas proposée au public.')
    expect(page.find('h2').exists()).toBe(false)
  })

  it('le contrôle est réservé aux agents et à l administrateur', async () => {
    simulerSessionOuverte()
    vi.mocked(api.get).mockResolvedValue({ data: planDeTest() })
    const { router } = await monter(ControleView, '/controle/seances/1', { id: 1 })

    expect(router.currentRoute.value.name).toBe('accueil')
  })
})

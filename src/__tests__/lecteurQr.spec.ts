import QrScanner from 'qr-scanner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demarrerLecteur, lireImage } from '@/services/lecteurQr'

const scanner = {
  start: vi.fn<() => Promise<void>>(),
  stop: vi.fn<() => void>(),
  destroy: vi.fn<() => void>(),
}

vi.mock('qr-scanner', () => {
  const QrScannerSimule = vi.fn<() => typeof scanner>(function () {
    return scanner
  })
  return {
    default: Object.assign(QrScannerSimule, {
      scanImage: vi.fn<(image: unknown) => Promise<unknown>>(),
    }),
  }
})

describe('lecteur de QR codes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allume la caméra arrière et transmet chaque code lu', async () => {
    scanner.start.mockResolvedValue()
    const video = document.createElement('video')
    const surCode = vi.fn<(code: string) => void>()

    const lecteur = await demarrerLecteur(video, surCode)

    const [videoUtilisee, decoder, options] = vi.mocked(QrScanner).mock.calls[0] as unknown as [
      HTMLVideoElement,
      (resultat: { data: string }) => void,
      Record<string, unknown>,
    ]
    expect(videoUtilisee).toBe(video)
    expect(options).toMatchObject({
      preferredCamera: 'environment',
      returnDetailedScanResult: true,
    })
    decoder({ data: 'jeton-du-billet' })
    expect(surCode).toHaveBeenCalledWith('jeton-du-billet')

    lecteur.arreter()
    expect(scanner.stop).toHaveBeenCalledOnce()
    expect(scanner.destroy).toHaveBeenCalledOnce()
  })

  it('libère le lecteur si la caméra refuse de démarrer', async () => {
    scanner.start.mockRejectedValue(new Error('NotAllowedError'))

    await expect(demarrerLecteur(document.createElement('video'), vi.fn())).rejects.toThrow(
      'NotAllowedError',
    )
    expect(scanner.destroy).toHaveBeenCalledOnce()
  })

  it('lit le QR code d une photo', async () => {
    vi.mocked(QrScanner.scanImage).mockResolvedValue({
      data: 'jeton-du-billet',
      cornerPoints: [],
    } as never)
    const photo = new File(['image'], 'billet.jpg', { type: 'image/jpeg' })

    await expect(lireImage(photo)).resolves.toBe('jeton-du-billet')
    expect(QrScanner.scanImage).toHaveBeenCalledWith(photo, { returnDetailedScanResult: true })
  })
})

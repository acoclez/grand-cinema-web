import { afterEach, describe, expect, it, vi } from 'vitest'

import { enregistrerFichier, ouvrirPageExterne } from '@/services/navigation'

describe('navigation vers un autre site', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ouvre la page de paiement dans l onglet courant', () => {
    const assign = vi.fn<(url: string) => void>()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ assign } as unknown as Location)

    ouvrirPageExterne('https://checkout.stripe.com/c/pay/cs_1')

    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_1')
  })

  it('propose d enregistrer un billet PDF sous son nom, puis libère sa mémoire', () => {
    vi.useFakeTimers()
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
    const creer = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:billet')
    const liberer = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
    const liens: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      liens.push(this)
    })

    enregistrerFichier(pdf, 'billet-R-7KX4M2PA-B1.pdf')

    expect(creer).toHaveBeenCalledWith(pdf)
    expect(liens.map((lien) => [lien.href, lien.download])).toEqual([
      ['blob:billet', 'billet-R-7KX4M2PA-B1.pdf'],
    ])
    expect(liberer).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(liberer).toHaveBeenCalledWith('blob:billet')
    vi.useRealTimers()
  })
})

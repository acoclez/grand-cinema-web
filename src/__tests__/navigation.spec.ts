import { afterEach, describe, expect, it, vi } from 'vitest'

import { ouvrirPageExterne } from '@/services/navigation'

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
})

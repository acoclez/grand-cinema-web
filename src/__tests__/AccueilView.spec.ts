import { describe, expect, it } from 'vitest'

import { monter } from '@/__tests__/outils'
import { useAuthStore } from '@/stores/auth'
import AccueilView from '@/views/AccueilView.vue'

describe('page d accueil', () => {
  it('affiche une seule fois le message laissé par la page précédente', async () => {
    const { page } = await monter(AccueilView, '/', {}, () => {
      useAuthStore().annonce = 'Votre compte est supprimé: vos données personnelles sont effacées.'
    })

    expect(page.find('[role="status"]').text()).toBe(
      'Votre compte est supprimé: vos données personnelles sont effacées.',
    )
    page.unmount()
    expect(useAuthStore().annonce).toBeNull()
  })
})

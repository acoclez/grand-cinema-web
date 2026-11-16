import { describe, expect, it } from 'vitest'

import { useFormulaire } from '@/composables/useFormulaire'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'

describe('useFormulaire', () => {
  it('indique la réussite et la fin de l envoi', async () => {
    const formulaire = useFormulaire()
    let pendantEnvoi = false

    const reussi = await formulaire.envoyer(async () => {
      pendantEnvoi = formulaire.envoiEnCours.value
    })

    expect(reussi).toBe(true)
    expect(pendantEnvoi).toBe(true)
    expect(formulaire.envoiEnCours.value).toBe(false)
  })

  it('place les erreurs de validation sous chaque champ', async () => {
    const formulaire = useFormulaire()

    const reussi = await formulaire.envoyer(() =>
      Promise.reject(
        new ErreurApi('Données invalides.', 422, {
          email: ['Adresse invalide.', 'Second message.'],
        }),
      ),
    )

    expect(reussi).toBe(false)
    expect(formulaire.erreurs.value).toEqual({ email: 'Adresse invalide.' })
    expect(formulaire.erreurGenerale.value).toBeNull()
  })

  it('affiche les autres erreurs dans un message général', async () => {
    const formulaire = useFormulaire()

    await formulaire.envoyer(() =>
      Promise.reject(new ErreurApi('Trop de tentatives. Réessayez dans une minute.', 429)),
    )
    expect(formulaire.erreurGenerale.value).toBe('Trop de tentatives. Réessayez dans une minute.')

    await formulaire.envoyer(() => Promise.reject(new Error('inattendue')))
    expect(formulaire.erreurGenerale.value).toBe(MESSAGE_ERREUR_INATTENDUE)
  })
})

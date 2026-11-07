import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  api,
  brancherAuthentification,
  ErreurApi,
  MESSAGE_ERREUR_INATTENDUE,
  MESSAGE_SERVEUR_INJOIGNABLE,
} from '@/services/api'

const fetchSimule = vi.fn<typeof fetch>()

function reponseJson(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Options du dernier appel à fetch. */
function derniereRequete(): { url: string; options: RequestInit; entetes: Record<string, string> } {
  const [url, options = {}] = fetchSimule.mock.lastCall ?? []
  return { url: String(url), options, entetes: options.headers as Record<string, string> }
}

describe('service api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSimule)
    brancherAuthentification({ jeton: () => null, jetonRefuse: vi.fn<() => void>() })
  })

  afterEach(() => {
    fetchSimule.mockReset()
    vi.unstubAllGlobals()
  })

  it('envoie et reçoit du JSON', async () => {
    fetchSimule.mockResolvedValue(reponseJson(200, { message: 'ok' }))

    await expect(api.post('/auth/connexion', { email: 'a@b.fr' })).resolves.toEqual({
      message: 'ok',
    })

    const { url, options, entetes } = derniereRequete()
    expect(url).toMatch(/\/auth\/connexion$/)
    expect(options.method).toBe('POST')
    expect(options.body).toBe('{"email":"a@b.fr"}')
    expect(entetes['Content-Type']).toBe('application/json')
    expect(entetes.Accept).toBe('application/json')
    expect(entetes.Authorization).toBeUndefined()
  })

  it('ajoute le jeton du compte connecté', async () => {
    brancherAuthentification({ jeton: () => 'jeton-abc', jetonRefuse: vi.fn<() => void>() })
    fetchSimule.mockResolvedValue(reponseJson(200, {}))

    await api.get('/auth/moi')

    const { options, entetes } = derniereRequete()
    expect(entetes.Authorization).toBe('Bearer jeton-abc')
    expect(options.method).toBe('GET')
    expect(options.body).toBeUndefined()
  })

  it('envoie une modification en PUT avec son corps', async () => {
    fetchSimule.mockResolvedValue(reponseJson(200, { data: {} }))

    await api.put('/admin/films/4', { titre: 'Brume' })

    const { url, options } = derniereRequete()
    expect(url).toMatch(/\/admin\/films\/4$/)
    expect(options.method).toBe('PUT')
    expect(options.body).toBe('{"titre":"Brume"}')
  })

  it('envoie une suppression en DELETE, sans corps', async () => {
    fetchSimule.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(api.delete('/admin/seances/4')).resolves.toBeUndefined()

    const { url, options } = derniereRequete()
    expect(url).toMatch(/\/admin\/seances\/4$/)
    expect(options.method).toBe('DELETE')
    expect(options.body).toBeUndefined()
  })

  it('renvoie undefined pour une réponse sans contenu', async () => {
    fetchSimule.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(api.post('/auth/deconnexion')).resolves.toBeUndefined()
  })

  it('transmet les erreurs de validation par champ', async () => {
    fetchSimule.mockResolvedValue(
      reponseJson(422, {
        message: 'Données invalides.',
        errors: { email: ['Un compte existe déjà avec cette adresse e-mail.'] },
      }),
    )

    const erreur = await api.post('/auth/inscription', {}).catch((e: unknown) => e)

    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur).toMatchObject({
      statut: 422,
      erreurs: { email: ['Un compte existe déjà avec cette adresse e-mail.'] },
    })
  })

  it('signale un jeton refusé par l API', async () => {
    const jetonRefuse = vi.fn<() => void>()
    brancherAuthentification({ jeton: () => 'jeton-expire', jetonRefuse })
    fetchSimule.mockResolvedValue(reponseJson(401, { message: 'Authentification requise.' }))

    await expect(api.get('/auth/moi')).rejects.toMatchObject({
      statut: 401,
      message: 'Authentification requise.',
    })
    expect(jetonRefuse).toHaveBeenCalledOnce()
  })

  it('ne ferme pas la session sur un refus de connexion sans jeton', async () => {
    const jetonRefuse = vi.fn<() => void>()
    brancherAuthentification({ jeton: () => null, jetonRefuse })
    fetchSimule.mockResolvedValue(
      reponseJson(401, { message: 'Adresse e-mail ou mot de passe incorrect.' }),
    )

    await expect(api.post('/auth/connexion', {})).rejects.toMatchObject({ statut: 401 })
    expect(jetonRefuse).not.toHaveBeenCalled()
  })

  it('remplace le message technique d une erreur serveur', async () => {
    fetchSimule.mockResolvedValue(reponseJson(500, { message: 'Server Error' }))

    await expect(api.get('/auth/moi')).rejects.toMatchObject({
      statut: 500,
      message: MESSAGE_ERREUR_INATTENDUE,
    })
  })

  it('signale un serveur injoignable', async () => {
    fetchSimule.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(api.get('/auth/moi')).rejects.toMatchObject({
      statut: 0,
      message: MESSAGE_SERVEUR_INJOIGNABLE,
    })
  })
})

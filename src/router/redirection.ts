import type { LocationQueryValue, RouteLocationRaw } from 'vue-router'

/**
 * Page affichée après la connexion: la page demandée avant la connexion si c'est
 * une adresse interne au site, sinon l'espace du compte.
 */
export function destinationApresConnexion(
  redirection: LocationQueryValue | LocationQueryValue[] | undefined,
): RouteLocationRaw {
  if (
    typeof redirection === 'string' &&
    redirection.startsWith('/') &&
    !redirection.startsWith('//')
  ) {
    return redirection
  }
  return { name: 'mon-compte' }
}

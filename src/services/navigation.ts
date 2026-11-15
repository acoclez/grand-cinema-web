/**
 * Ouvre la page d'un autre site dans l'onglet courant, par exemple la page de paiement de Stripe.
 * Isolée dans ce module pour que les tests la remplacent: jsdom ne change pas de page.
 */
export function ouvrirPageExterne(url: string): void {
  window.location.assign(url)
}

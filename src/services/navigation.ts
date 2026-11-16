/**
 * Navigation hors de l'application: une page d'un autre site, un fichier à enregistrer.
 * Isolée dans ce module pour que les tests la remplacent: jsdom ne change pas de page.
 */

/** Ouvre la page d'un autre site dans l'onglet courant, par exemple la page de paiement de Stripe. */
export function ouvrirPageExterne(url: string): void {
  window.location.assign(url)
}

/** Propose d'enregistrer un fichier reçu de l'API, par exemple un billet PDF. */
export function enregistrerFichier(contenu: Blob, nom: string): void {
  const adresse = URL.createObjectURL(contenu)
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  lien.click()
  // Laisse au navigateur le temps de lire le fichier avant de libérer sa mémoire.
  setTimeout(() => URL.revokeObjectURL(adresse), 1000)
}

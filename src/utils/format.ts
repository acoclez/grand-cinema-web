/**
 * Mise en forme des dates et des prix du back-office.
 *
 * L'API renvoie les horaires à l'heure de Paris, avec leur décalage
 * (2026-11-20T20:30:00+01:00). La date et l'heure sont lues directement dans ce texte:
 * l'horaire affiché reste celui du cinéma, quel que soit le fuseau de l'ordinateur.
 */

/** Jour au format AAAA-MM-JJ, par exemple 2026-11-20. */
export function jourIso(date: Date = new Date()): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mois}-${jour}`
}

/** Décale un jour AAAA-MM-JJ d'un nombre de jours. */
export function decalerJour(jour: string, nombre: number): string {
  const [annee, mois, quantieme] = jour.split('-').map(Number)
  return jourIso(new Date(annee ?? 0, (mois ?? 1) - 1, (quantieme ?? 1) + nombre))
}

/** Partie date d'un horaire de l'API: 2026-11-20. */
export function dateDe(horaire: string): string {
  return horaire.slice(0, 10)
}

/** Partie heure d'un horaire de l'API: 20:30. */
export function heureDe(horaire: string): string {
  return horaire.slice(11, 16)
}

/** Jour en toutes lettres: vendredi 20 novembre 2026. */
export function jourEnLettres(jour: string): string {
  const [annee, mois, quantieme] = jour.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(
    new Date(annee ?? 0, (mois ?? 1) - 1, quantieme ?? 1),
  )
}

const formatEuros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Prix lisible: 950 centimes donnent 9,50 €. */
export function prixEnEuros(centimes: number): string {
  return formatEuros.format(centimes / 100)
}

/** Prix saisi pour le formulaire: 950 centimes donnent 9,50. */
export function saisieDePrix(centimes: number): string {
  return (centimes / 100).toFixed(2).replace('.', ',')
}

/**
 * Prix saisi en euros (9,50 ou 9.5) converti en centimes. Une saisie vide ou illisible
 * donne null: l'API signale alors le prix comme obligatoire.
 */
export function centimesDe(saisie: string): number | null {
  const texte = saisie.trim().replace(',', '.')
  if (texte === '' || Number.isNaN(Number(texte))) {
    return null
  }
  return Math.round(Number(texte) * 100)
}

/** Durée lisible d'un film: 112 minutes donne 1H52, 45 minutes donne 45 min. */
export function dureeLisible(minutes: number): string {
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  if (heures === 0) {
    return `${reste} min`
  }
  return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, '0')}`
}

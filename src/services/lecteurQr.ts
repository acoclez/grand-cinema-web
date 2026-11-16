import QrScanner from 'qr-scanner'

/**
 * Lecture des QR codes des billets, avec la caméra du téléphone ou depuis une photo.
 * Isolée dans ce module pour que les tests la remplacent: jsdom n'a pas de caméra.
 */

/**
 * Un même QR code resté devant la caméra n'est contrôlé qu'une fois pendant ce délai: sinon le
 * billet qui vient d'être validé s'afficherait aussitôt « Déjà utilisé ».
 */
export const DELAI_MEME_CODE_MS = 10_000

export interface Lecteur {
  arreter: () => void
}

/** Allume la caméra arrière et appelle surCode à chaque QR code lu. */
export async function demarrerLecteur(
  video: HTMLVideoElement,
  surCode: (code: string) => void,
): Promise<Lecteur> {
  const scanner = new QrScanner(video, (resultat) => surCode(resultat.data), {
    preferredCamera: 'environment',
    highlightScanRegion: true,
    returnDetailedScanResult: true,
  })
  try {
    await scanner.start()
  } catch (erreur) {
    scanner.destroy()
    throw erreur
  }
  return {
    arreter: () => {
      scanner.stop()
      scanner.destroy()
    },
  }
}

/** Lit le QR code d'une photo, par exemple prise avec l'appareil photo du téléphone. */
export async function lireImage(image: File): Promise<string> {
  return (await QrScanner.scanImage(image, { returnDetailedScanResult: true })).data
}

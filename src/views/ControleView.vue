<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import EnTeteSeance from '@/components/EnTeteSeance.vue'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { DELAI_MEME_CODE_MS, demarrerLecteur, lireImage, type Lecteur } from '@/services/lecteurQr'
import { useControleStore } from '@/stores/controle'
import { TITRES_DU_CONTROLE } from '@/types/controle'
import { libellePlace } from '@/types/reservation'

/**
 * Contrôle des billets à l'entrée d'une séance (US-11): l'agent d'accueil scanne le QR code de
 * chaque billet avec la caméra de son téléphone, ou depuis une photo, et voit aussitôt si le
 * spectateur peut entrer.
 */
const props = defineProps<{ id: number }>()

const store = useControleStore()
const { rediriger } = useSessionExpiree()

const video = ref<HTMLVideoElement | null>(null)
const chargement = ref(true)
const envoi = ref(false)
const erreur = ref<string | null>(null)
const camera = ref<'arretee' | 'demarrage' | 'active'>('arretee')
let lecteur: Lecteur | null = null
/** Dernier code contrôlé et son heure, pour ignorer le même QR code resté devant la caméra. */
let dernierCode = ''
let dernierControle = 0

async function signaler(e: unknown): Promise<void> {
  if (!(await rediriger(e))) {
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  }
}

async function controler(code: string): Promise<void> {
  const repete = code === dernierCode && Date.now() - dernierControle < DELAI_MEME_CODE_MS
  if (envoi.value || repete) {
    return
  }
  dernierCode = code
  dernierControle = Date.now()
  envoi.value = true
  erreur.value = null
  try {
    await store.controler(props.id, code)
  } catch (e) {
    await signaler(e)
  } finally {
    envoi.value = false
  }
}

async function demarrerCamera(): Promise<void> {
  if (video.value === null) {
    return
  }
  camera.value = 'demarrage'
  erreur.value = null
  try {
    lecteur = await demarrerLecteur(video.value, controler)
    camera.value = 'active'
  } catch {
    camera.value = 'arretee'
    erreur.value =
      'La caméra est indisponible: autorisez son accès dans le navigateur, ou scannez une photo du QR code.'
  }
}

function arreterCamera(): void {
  lecteur?.arreter()
  lecteur = null
  camera.value = 'arretee'
}

async function scannerPhoto(evenement: Event): Promise<void> {
  const champ = evenement.target as HTMLInputElement
  const photo = champ.files?.[0]
  if (photo === undefined) {
    return
  }
  erreur.value = null
  let code: string
  try {
    code = await lireImage(photo)
  } catch {
    erreur.value = 'Aucun QR code lisible sur cette photo: reprenez-la de plus près.'
    return
  } finally {
    // Permet de choisir à nouveau la même photo.
    champ.value = ''
  }
  // Une photo est un choix volontaire: elle est contrôlée même si le code vient d'être lu.
  dernierCode = ''
  await controler(code)
}

onMounted(async () => {
  try {
    await store.chargerSeance(props.id)
  } catch (e) {
    if (e instanceof ErreurApi && e.statut === 404) {
      erreur.value = 'Cette séance n’est pas proposée au public.'
    } else {
      await signaler(e)
    }
  } finally {
    chargement.value = false
  }
})

onBeforeUnmount(arreterCamera)
</script>

<template>
  <main class="controle">
    <p class="fil-ariane"><RouterLink :to="{ name: 'seances' }">Toutes les séances</RouterLink></p>

    <p v-if="chargement" role="status">Chargement de la séance…</p>
    <template v-else-if="store.seance">
      <EnTeteSeance :seance="store.seance" />
      <h2>Contrôle des billets</h2>

      <div :class="['controle__camera', { 'controle__camera--active': camera !== 'arretee' }]">
        <video ref="video" class="controle__video" muted playsinline></video>
      </div>
      <div class="actions">
        <button
          v-if="camera !== 'active'"
          type="button"
          class="bouton"
          :disabled="camera === 'demarrage'"
          @click="demarrerCamera"
        >
          Scanner avec la caméra
        </button>
        <button v-else type="button" class="bouton-lien" @click="arreterCamera">
          Arrêter la caméra
        </button>
        <label class="bouton-lien" for="controle-photo">Scanner depuis une photo</label>
        <input
          id="controle-photo"
          class="visuellement-cache"
          type="file"
          accept="image/*"
          capture="environment"
          @change="scannerPhoto"
        />
      </div>

      <div class="controle__resultat" role="status" aria-live="assertive">
        <p v-if="envoi">Contrôle en cours…</p>
        <div
          v-else-if="store.dernier"
          :class="['resultat-controle', `resultat-controle--${store.dernier.resultat}`]"
        >
          <p class="resultat-controle__titre">
            {{ TITRES_DU_CONTROLE[store.dernier.resultat] }}
          </p>
          <p v-if="store.dernier.resultat !== 'valide'" class="resultat-controle__message">
            {{ store.dernier.message }}
          </p>
          <dl v-if="store.dernier.billet" class="resultat-controle__billet">
            <dt>Film</dt>
            <dd>{{ store.dernier.billet.film }}</dd>
            <dt>Salle</dt>
            <dd>{{ store.dernier.billet.salle }}</dd>
            <dt>Place</dt>
            <dd>
              {{ libellePlace(store.dernier.billet.place)
              }}<span v-if="store.dernier.billet.place.pmr"> (PMR)</span>
            </dd>
            <template v-if="store.dernier.billet.tarif">
              <dt>Tarif</dt>
              <dd>{{ store.dernier.billet.tarif }}</dd>
            </template>
          </dl>
        </div>
        <p v-else class="controle__consigne">
          Scannez le QR code d’un billet: le résultat s’affiche ici.
        </p>
      </div>
    </template>
    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
  </main>
</template>

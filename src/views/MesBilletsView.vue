<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useBilletsStore } from '@/stores/billets'
import type { Billet } from '@/types/billet'
import { libellePlace } from '@/types/reservation'
import { dateDe, heureDe, jourEnLettres, prixEnEuros } from '@/utils/format'

/**
 * Mes billets (US-10): les billets des séances à venir, regroupés par réservation. Chaque billet
 * montre son QR code, à présenter à l'entrée, et se télécharge en PDF.
 */
const store = useBilletsStore()
const { rediriger } = useSessionExpiree()

const chargement = ref(true)
/** Billet en cours de téléchargement. */
const enTelechargement = ref<number | null>(null)
const erreur = ref<string | null>(null)

async function signaler(e: unknown): Promise<void> {
  if (!(await rediriger(e))) {
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  }
}

async function telecharger(billet: Billet): Promise<void> {
  enTelechargement.value = billet.id
  erreur.value = null
  try {
    await store.telecharger(billet)
  } catch (e) {
    await signaler(e)
  } finally {
    enTelechargement.value = null
  }
}

onMounted(async () => {
  try {
    await store.charger()
  } catch (e) {
    await signaler(e)
  } finally {
    chargement.value = false
  }
})
</script>

<template>
  <main>
    <h1>Mes billets</h1>
    <p>
      Présentez le QR code de chaque billet à l’entrée de la salle, sur votre téléphone ou imprimé.
    </p>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-if="chargement" role="status">Chargement de vos billets…</p>
    <p v-else-if="store.parReservation.length === 0 && !erreur" class="message">
      Vous n’avez aucun billet pour une séance à venir.
      <RouterLink :to="{ name: 'seances' }">Voir les séances</RouterLink>
    </p>

    <section
      v-for="groupe in store.parReservation"
      :key="groupe.reservation.id"
      class="billets"
      :aria-labelledby="`reservation-${groupe.reservation.id}`"
    >
      <h2 :id="`reservation-${groupe.reservation.id}`">{{ groupe.seance.film.titre }}</h2>
      <p class="billets__seance">
        {{ jourEnLettres(dateDe(groupe.seance.debut)) }} à {{ heureDe(groupe.seance.debut) }},
        {{ groupe.seance.salle.nom }}, {{ groupe.seance.langue.toUpperCase() }} · Réservation
        {{ groupe.reservation.numero }}
      </p>
      <ul class="billets__liste">
        <li v-for="billet in groupe.billets" :key="billet.id" class="billet">
          <img
            class="billet__qr"
            :src="billet.qr_code"
            :alt="`QR code du billet de la place ${libellePlace(billet.place)}`"
            width="180"
            height="180"
          />
          <p class="billet__place">
            Place {{ libellePlace(billet.place) }}<span v-if="billet.place.pmr"> (PMR)</span>
          </p>
          <p>{{ billet.tarif }} · {{ prixEnEuros(billet.prix_centimes) }}</p>
          <p v-if="billet.utilise_at" class="billet__utilise">Déjà utilisé</p>
          <button
            type="button"
            class="bouton-lien"
            :disabled="enTelechargement !== null"
            @click="telecharger(billet)"
          >
            {{
              enTelechargement === billet.id
                ? 'Téléchargement…'
                : `Télécharger le billet ${libellePlace(billet.place)} (PDF)`
            }}
          </button>
        </li>
      </ul>
    </section>
  </main>
</template>

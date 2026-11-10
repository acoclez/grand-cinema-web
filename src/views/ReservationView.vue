<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useReservationStore } from '@/stores/reservation'
import { libellePlace, type Reservation } from '@/types/reservation'
import { compteARebours, dateDe, heureDe, jourEnLettres } from '@/utils/format'

/**
 * Réservation en cours: les places restent bloquées 10 minutes, le temps de payer.
 * Le compte à rebours part du temps restant donné par l'API.
 */
const props = defineProps<{ id: number }>()

const store = useReservationStore()
const router = useRouter()
const { rediriger } = useSessionExpiree()

const reservation = ref<Reservation | null>(null)
const chargement = ref(true)
const envoi = ref(false)
const erreur = ref<string | null>(null)
const secondes = ref(0)
let finDuBlocage = 0
let minuterie: ReturnType<typeof setInterval> | undefined

const enAttente = computed(() => reservation.value?.statut === 'en_attente' && secondes.value > 0)
const places = computed(() => {
  const liste = reservation.value?.places ?? []
  const libelles = liste.map(libellePlace).join(', ')
  return liste.length === 1 ? `${libelles} (1 place)` : `${libelles} (${liste.length} places)`
})

function decompter(): void {
  secondes.value = Math.max(0, Math.round((finDuBlocage - Date.now()) / 1000))
  if (secondes.value === 0) {
    clearInterval(minuterie)
  }
}

function demarrerCompteARebours(restantes: number): void {
  clearInterval(minuterie)
  finDuBlocage = Date.now() + restantes * 1000
  decompter()
  if (secondes.value > 0) {
    minuterie = setInterval(decompter, 1000)
  }
}

async function agir(action: (enCours: Reservation) => Promise<void>): Promise<void> {
  if (reservation.value === null) {
    return
  }
  envoi.value = true
  erreur.value = null
  try {
    await action(reservation.value)
  } catch (e) {
    if (!(await rediriger(e))) {
      erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
    }
  } finally {
    envoi.value = false
  }
}

const abandonner = () =>
  agir(async (enCours) => {
    await store.abandonner(enCours.id)
    reservation.value = { ...enCours, statut: 'annulee', secondes_restantes: 0 }
    demarrerCompteARebours(0)
  })

const modifier = () =>
  agir(async (enCours) => {
    const seance = await store.modifier(enCours)
    await router.push({ name: 'plan-de-salle', params: { id: seance } })
  })

onMounted(async () => {
  try {
    // Juste après le blocage, la réservation est déjà dans le store.
    reservation.value =
      store.reservation?.id === props.id
        ? store.reservation
        : await store.chargerReservation(props.id)
    demarrerCompteARebours(reservation.value.secondes_restantes)
  } catch (e) {
    if (!(await rediriger(e))) {
      erreur.value =
        e instanceof ErreurApi && e.statut === 404
          ? 'Cette réservation est introuvable.'
          : e instanceof ErreurApi
            ? e.message
            : MESSAGE_ERREUR_INATTENDUE
    }
  } finally {
    chargement.value = false
  }
})

onBeforeUnmount(() => clearInterval(minuterie))
</script>

<template>
  <main>
    <h1>Votre réservation</h1>

    <p v-if="chargement" role="status">Chargement de la réservation…</p>
    <template v-else-if="reservation">
      <dl class="profil">
        <dt>Numéro</dt>
        <dd class="reservation__numero">{{ reservation.numero }}</dd>
        <dt>Film</dt>
        <dd>{{ reservation.seance.film.titre }}</dd>
        <dt>Séance</dt>
        <dd>
          {{ jourEnLettres(dateDe(reservation.seance.debut)) }} à
          {{ heureDe(reservation.seance.debut) }}, {{ reservation.seance.salle.nom }},
          {{ reservation.seance.langue.toUpperCase() }}
        </dd>
        <dt>Places</dt>
        <dd class="reservation__places">{{ places }}</dd>
      </dl>

      <template v-if="enAttente">
        <p class="message message--succes compte-a-rebours">
          Vos places sont bloquées pour vous pendant encore
          <strong>{{ compteARebours(secondes) }}</strong
          >.
        </p>
        <p>Le choix des tarifs et le paiement en ligne se font à l’étape suivante.</p>
        <div class="actions">
          <button type="button" class="bouton-lien" :disabled="envoi" @click="modifier">
            Modifier mes places
          </button>
          <button type="button" class="bouton-lien" :disabled="envoi" @click="abandonner">
            Abandonner la réservation
          </button>
        </div>
      </template>
      <p v-else-if="reservation.statut === 'confirmee'" class="message message--succes">
        Votre réservation est confirmée.
      </p>
      <template v-else>
        <p class="message reservation__fin" role="status">
          {{
            reservation.statut === 'annulee'
              ? 'Vous avez abandonné cette réservation: ses places sont libérées.'
              : 'Le délai de 10 minutes est dépassé: vos places ont été libérées.'
          }}
        </p>
        <RouterLink
          class="bouton"
          :to="{ name: 'plan-de-salle', params: { id: reservation.seance.id } }"
        >
          Choisir de nouvelles places
        </RouterLink>
      </template>
      <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    </template>
    <p v-else class="message message--erreur" role="alert">{{ erreur }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import PlanDeSalle from '@/components/PlanDeSalle.vue'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { ACTUALISATION_PLAN_MS, useReservationStore } from '@/stores/reservation'
import { libellePlace, type PlaceDuPlan } from '@/types/reservation'
import { LIBELLES_TYPE_SALLE } from '@/types/salle'
import { dateDe, heureDe, jourEnLettres } from '@/utils/format'

/** Plan de salle d'une séance: le spectateur choisit ses places et les bloque (US-08). */
const props = defineProps<{ id: number }>()

const reservation = useReservationStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { rediriger } = useSessionExpiree()

const chargement = ref(true)
const envoi = ref(false)
const erreur = ref<string | null>(null)
/** Annonce lue par les lecteurs d'écran: place prise entre-temps, limite atteinte. */
const annonce = ref<string | null>(null)
let actualisation: ReturnType<typeof setInterval> | undefined

const plan = computed(() => reservation.plan)
/** Un visiteur peut choisir ses places, puis se connecter. Le personnel ne réserve pas en ligne. */
const peutReserver = computed(() => !auth.estConnecte || auth.aUnDesRoles(['spectateur']))
const consultationSeule = computed(() => !plan.value?.reservable || !peutReserver.value)

const placesLibres = computed(() => {
  const libres = plan.value?.places_libres ?? 0
  const capacite = plan.value?.seance.salle.capacite ?? 0
  return libres === 1 ? `1 place libre sur ${capacite}` : `${libres} places libres sur ${capacite}`
})

const resumeSelection = computed(() => {
  const choisies = reservation.placesChoisies
  if (choisies.length === 0) {
    return 'Aucune place choisie.'
  }
  const libelles = choisies.map(libellePlace).join(', ')
  return choisies.length === 1
    ? `1 place choisie: ${libelles}`
    : `${choisies.length} places choisies: ${libelles}`
})

function annoncerPrises(prises: PlaceDuPlan[]): void {
  if (prises.length === 1) {
    annonce.value = `La place ${libellePlace(prises[0]!)} vient d’être prise: choisissez-en une autre.`
  } else if (prises.length > 1) {
    annonce.value = `Les places ${prises.map(libellePlace).join(', ')} viennent d’être prises: choisissez-en d’autres.`
  }
}

async function actualiser(): Promise<void> {
  try {
    annoncerPrises(await reservation.chargerPlan(props.id))
  } catch {
    // Une relecture manquée n'efface pas le plan affiché: la suivante le remettra à jour.
  }
}

async function chargerPremiereFois(): Promise<void> {
  try {
    annoncerPrises(await reservation.chargerPlan(props.id))
  } catch (e) {
    reservation.plan = null
    if (e instanceof ErreurApi && e.statut === 404) {
      erreur.value = 'Cette séance n’est pas proposée à la réservation.'
    } else {
      erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
    }
  } finally {
    chargement.value = false
  }
}

function basculer(place: PlaceDuPlan): void {
  annonce.value = null
  const dejaChoisie = reservation.selection.includes(place.id)
  if (!dejaChoisie && reservation.selection.length >= (plan.value?.places_max ?? 0)) {
    annonce.value = `Vous pouvez choisir ${plan.value?.places_max} places au maximum.`
    return
  }
  reservation.basculer(place)
}

async function reserver(): Promise<void> {
  if (!auth.estConnecte) {
    // La sélection reste dans le store: elle sera là au retour de la connexion.
    await router.push({ name: 'connexion', query: { redirection: route.fullPath } })
    return
  }
  envoi.value = true
  erreur.value = null
  try {
    const bloquee = await reservation.bloquer(props.id)
    await router.push({ name: 'reservation', params: { id: bloquee.id } })
  } catch (e) {
    if (await rediriger(e)) {
      return
    }
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
    if (e instanceof ErreurApi && e.statut === 409) {
      // Places prises entre-temps ou séance commencée: le plan à jour le montre.
      annonce.value = null
      await reservation.chargerPlan(props.id).catch(() => [])
    }
  } finally {
    envoi.value = false
  }
}

onMounted(async () => {
  await chargerPremiereFois()
  actualisation = setInterval(actualiser, ACTUALISATION_PLAN_MS)
})

onBeforeUnmount(() => clearInterval(actualisation))
</script>

<template>
  <main>
    <p class="fil-ariane"><RouterLink :to="{ name: 'seances' }">Toutes les séances</RouterLink></p>

    <p v-if="chargement" role="status">Chargement du plan de salle…</p>
    <template v-else-if="plan">
      <h1>{{ plan.seance.film.titre }}</h1>
      <p class="plan-seance">
        {{ jourEnLettres(dateDe(plan.seance.debut)) }} à {{ heureDe(plan.seance.debut) }} ·
        {{ plan.seance.salle.nom }} · {{ LIBELLES_TYPE_SALLE[plan.seance.salle.type] }} ·
        {{ plan.seance.langue.toUpperCase() }}
      </p>

      <p v-if="!plan.reservable" class="message message--erreur">
        Cette séance a commencé: ses places ne se réservent plus.
      </p>
      <p v-else-if="!peutReserver" class="message">
        La réservation en ligne est réservée aux comptes spectateurs.
      </p>
      <p v-else class="plan-consigne">
        Choisissez jusqu’à {{ plan.places_max }} places. Elles seront bloquées pour vous pendant
        {{ plan.blocage_minutes }} minutes, le temps de payer.
      </p>
      <p class="plan-libres">{{ placesLibres }}</p>

      <PlanDeSalle
        :places="plan.places"
        :selection="reservation.selection"
        :desactive="consultationSeule"
        @basculer="basculer"
      />

      <div role="status" aria-live="polite">
        <p v-if="annonce" class="message message--erreur plan-annonce">{{ annonce }}</p>
      </div>
      <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>

      <div v-if="!consultationSeule" class="selection actions">
        <p class="selection__resume">{{ resumeSelection }}</p>
        <button
          type="button"
          class="bouton"
          :disabled="reservation.selection.length === 0 || envoi"
          @click="reserver"
        >
          {{ auth.estConnecte ? 'Réserver ces places' : 'Se connecter pour réserver' }}
        </button>
      </div>
    </template>
    <p v-else class="message message--erreur" role="alert">{{ erreur }}</p>
  </main>
</template>

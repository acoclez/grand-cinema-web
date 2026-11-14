<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import EnTeteSeance from '@/components/EnTeteSeance.vue'
import PlanDeSalle from '@/components/PlanDeSalle.vue'
import { usePlanDeSalle } from '@/composables/usePlanDeSalle'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useReservationStore } from '@/stores/reservation'
import { libellePlace, placesLibres, type PlaceDuPlan } from '@/types/reservation'

/** Plan de salle d'une séance: le spectateur choisit ses places et les bloque (US-08). */
const props = defineProps<{ id: number }>()

const reservation = useReservationStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { rediriger } = useSessionExpiree()

const envoi = ref(false)
const { chargement, erreur, annonce } = usePlanDeSalle(
  () => reservation.chargerPlan(props.id),
  () => {
    reservation.plan = null
  },
)

const plan = computed(() => reservation.plan)
/** Un visiteur peut choisir ses places, puis se connecter. Le personnel ne réserve pas en ligne. */
const peutReserver = computed(() => !auth.estConnecte || auth.aUnDesRoles(['spectateur']))
const consultationSeule = computed(() => !plan.value?.reservable || !peutReserver.value)

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
</script>

<template>
  <main>
    <p class="fil-ariane"><RouterLink :to="{ name: 'seances' }">Toutes les séances</RouterLink></p>

    <p v-if="chargement" role="status">Chargement du plan de salle…</p>
    <template v-else-if="plan">
      <EnTeteSeance :seance="plan.seance" />

      <p v-if="!plan.reservable" class="message message--erreur">
        Cette séance a commencé: ses places ne se réservent plus.
      </p>
      <p v-else-if="!peutReserver" class="message">
        La réservation en ligne est réservée aux comptes spectateurs.
        <RouterLink :to="{ name: 'guichet', params: { id: plan.seance.id } }">
          Vendre des places au guichet
        </RouterLink>
      </p>
      <p v-else class="plan-consigne">
        Choisissez jusqu’à {{ plan.places_max }} places. Elles seront bloquées pour vous pendant
        {{ plan.blocage_minutes }} minutes, le temps de payer.
      </p>
      <p class="plan-libres">{{ placesLibres(plan) }}</p>

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

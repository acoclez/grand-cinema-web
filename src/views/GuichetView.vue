<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ChoixDesTarifs from '@/components/ChoixDesTarifs.vue'
import EnTeteSeance from '@/components/EnTeteSeance.vue'
import PlanDeSalle from '@/components/PlanDeSalle.vue'
import { usePlanDeSalle } from '@/composables/usePlanDeSalle'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useGuichetStore } from '@/stores/guichet'
import { libellePlace, placesLibres, type PlaceDuPlan } from '@/types/reservation'
import { prixEnEuros } from '@/utils/format'

/**
 * Vente au guichet (US-16): l'agent choisit les places du client sur le même plan que le site,
 * un tarif pour chacune, puis encaisse. Le plan est relu toutes les 5 secondes.
 */
const props = defineProps<{ id: number }>()

const guichet = useGuichetStore()
const { rediriger } = useSessionExpiree()
const envoi = ref(false)
const { chargement, erreur, annonce } = usePlanDeSalle(
  () => guichet.chargerPlan(props.id),
  () => {
    guichet.plan = null
  },
)

const plan = computed(() => guichet.plan)

/** Rappel de la vente encaissée, par exemple « Vente R-7KX4M2PA encaissée: B1, B2, 16,50 € ». */
const confirmation = computed(() => {
  const vente = guichet.derniereVente
  if (vente === null) {
    return null
  }
  const places = vente.places.map(libellePlace).join(', ')
  return `Vente ${vente.numero} encaissée: ${places}, ${prixEnEuros(vente.montant_centimes)}.`
})

function basculer(place: PlaceDuPlan): void {
  annonce.value = null
  guichet.basculer(place)
}

async function encaisser(): Promise<void> {
  envoi.value = true
  erreur.value = null
  annonce.value = null
  try {
    await guichet.vendre(props.id)
    await guichet.chargerPlan(props.id).catch(() => [])
  } catch (e) {
    if (await rediriger(e)) {
      return
    }
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
    if (e instanceof ErreurApi && e.statut === 409) {
      // Places prises en ligne entre-temps ou séance commencée: le plan à jour le montre.
      await guichet.chargerPlan(props.id).catch(() => [])
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
        Cette séance a commencé: ses places ne se vendent plus.
      </p>
      <p v-else class="plan-consigne">
        Vente au guichet: choisissez les places du client sur le plan, puis le tarif de chaque
        place.
      </p>
      <p class="plan-libres">{{ placesLibres(plan) }}</p>

      <PlanDeSalle
        :places="plan.places"
        :selection="guichet.selection"
        :desactive="!plan.reservable"
        @basculer="basculer"
      />

      <div role="status" aria-live="polite">
        <p v-if="annonce" class="message message--erreur plan-annonce">{{ annonce }}</p>
        <p v-if="confirmation" class="message message--succes guichet__confirmation">
          {{ confirmation }}
        </p>
      </div>
      <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>

      <section v-if="plan.reservable" class="panier" aria-labelledby="panier-titre">
        <h2 id="panier-titre">Vente en cours</h2>
        <p v-if="guichet.placesChoisies.length === 0" class="selection__resume">
          Aucune place choisie.
        </p>
        <ChoixDesTarifs
          v-else
          v-model="guichet.tarifs"
          :places="guichet.placesChoisies"
          :tarifs="plan.tarifs"
        />
        <div class="actions">
          <p class="panier__total">Total: {{ prixEnEuros(guichet.total) }}</p>
          <button
            type="button"
            class="bouton"
            :disabled="guichet.placesChoisies.length === 0 || envoi"
            @click="encaisser"
          >
            Encaisser {{ prixEnEuros(guichet.total) }}
          </button>
        </div>
      </section>
    </template>
    <p v-else class="message message--erreur" role="alert">{{ erreur }}</p>
  </main>
</template>

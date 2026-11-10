<script setup lang="ts">
import { computed } from 'vue'

import { libellePlace, type PlaceDuPlan } from '@/types/reservation'

/**
 * Plan d'une salle: une rangée par ligne, l'écran en haut. Chaque place est un bouton
 * qui la choisit ou la retire de la sélection. Une place occupée ne se choisit pas.
 */
const props = defineProps<{
  places: PlaceDuPlan[]
  selection: number[]
  /** Séance commencée ou compte qui ne réserve pas en ligne: le plan se consulte seulement. */
  desactive: boolean
}>()

const emit = defineEmits<{ basculer: [place: PlaceDuPlan] }>()

const rangees = computed(() => {
  const groupes = new Map<string, PlaceDuPlan[]>()
  for (const place of props.places) {
    groupes.set(place.rangee, [...(groupes.get(place.rangee) ?? []), place])
  }
  return [...groupes.entries()]
})

type Etat = 'choisie' | 'libre' | 'occupee'

function etat(place: PlaceDuPlan): Etat {
  if (props.selection.includes(place.id)) {
    return 'choisie'
  }
  return place.libre ? 'libre' : 'occupee'
}

const LIBELLES_ETAT: Record<Etat, string> = {
  choisie: 'choisie',
  libre: 'libre',
  occupee: 'occupée',
}

/** Nom lu par les lecteurs d'écran, par exemple « Place A1, libre, réservée aux personnes à mobilité réduite ». */
function nomAccessible(place: PlaceDuPlan): string {
  const pmr = place.pmr ? ', réservée aux personnes à mobilité réduite' : ''
  return `Place ${libellePlace(place)}, ${LIBELLES_ETAT[etat(place)]}${pmr}`
}
</script>

<template>
  <div class="plan">
    <div class="plan__defilant">
      <p class="plan__ecran" aria-hidden="true">Écran</p>
      <div class="plan__salle" role="group" aria-label="Plan de la salle">
        <div v-for="[rangee, placesDeLaRangee] in rangees" :key="rangee" class="plan__rangee">
          <span class="plan__nom-rangee" aria-hidden="true">{{ rangee }}</span>
          <button
            v-for="place in placesDeLaRangee"
            :key="place.id"
            type="button"
            :class="['place', `place--${etat(place)}`, { 'place--pmr': place.pmr }]"
            :aria-label="nomAccessible(place)"
            :aria-pressed="selection.includes(place.id)"
            :disabled="desactive || etat(place) === 'occupee'"
            @click="emit('basculer', place)"
          >
            {{ place.numero }}
          </button>
        </div>
      </div>
    </div>
    <ul class="legende" aria-label="Légende du plan">
      <li><span class="place place--libre" aria-hidden="true"></span> Libre</li>
      <li><span class="place place--choisie" aria-hidden="true"></span> Choisie</li>
      <li><span class="place place--occupee" aria-hidden="true"></span> Occupée</li>
      <li>
        <span class="place place--libre place--pmr" aria-hidden="true"></span>
        Réservée aux personnes à mobilité réduite
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { PlanDeSalle } from '@/types/reservation'
import { LIBELLES_TYPE_SALLE } from '@/types/salle'
import { dateDe, heureDe, jourEnLettres } from '@/utils/format'

/** Titre du film et séance au-dessus d'un plan de salle, sur le site comme au guichet. */
defineProps<{ seance: PlanDeSalle['seance'] }>()
</script>

<template>
  <h1>{{ seance.film.titre }}</h1>
  <p class="plan-seance">
    {{ jourEnLettres(dateDe(seance.debut)) }} à {{ heureDe(seance.debut) }} ·
    {{ seance.salle.nom }} · {{ LIBELLES_TYPE_SALLE[seance.salle.type] }} ·
    {{ seance.langue.toUpperCase() }}
  </p>
</template>

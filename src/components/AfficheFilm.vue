<script setup lang="ts">
/**
 * Affiche d'un film, ou un cadre neutre quand l'administrateur n'en a pas fourni.
 */
defineProps<{
  titre: string
  url: string | null
  decorative?: boolean
}>()
</script>

<template>
  <img
    v-if="url"
    class="affiche"
    :src="url"
    :alt="decorative ? '' : `Affiche du film ${titre}`"
    loading="lazy"
    width="300"
    height="450"
  />
  <div v-else class="affiche affiche--vide" :aria-hidden="decorative ? 'true' : undefined">
    <span>{{ titre }}</span>
  </div>
</template>

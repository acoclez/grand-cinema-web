<script setup lang="ts">
import { onMounted, ref } from 'vue'

import CarteFilm from '@/components/CarteFilm.vue'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useProgrammationStore } from '@/stores/programmation'

const programmation = useProgrammationStore()
const chargement = ref(true)
const erreur = ref<string | null>(null)

onMounted(async () => {
  try {
    await programmation.chargerFilms()
  } catch (e) {
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  } finally {
    chargement.value = false
  }
})
</script>

<template>
  <main>
    <h1>Films à l'affiche</h1>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-else-if="chargement" role="status">Chargement des films…</p>
    <p v-else-if="programmation.films.length === 0">Aucun film n'est à l'affiche pour le moment.</p>

    <div v-else class="grille-films">
      <CarteFilm v-for="film in programmation.films" :key="film.id" :film="film" />
    </div>
  </main>
</template>

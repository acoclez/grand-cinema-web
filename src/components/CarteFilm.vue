<script setup lang="ts">
import { RouterLink } from 'vue-router'

import AfficheFilm from '@/components/AfficheFilm.vue'
import type { FilmAlAffiche } from '@/types/film'
import { dureeLisible } from '@/utils/format'

/** Carte d'un film à l'affiche: son affiche et son titre, qui mènent à sa fiche. */
defineProps<{ film: FilmAlAffiche }>()
</script>

<template>
  <article class="carte-film">
    <RouterLink :to="{ name: 'fiche-film', params: { id: film.id } }" class="carte-film__lien">
      <AfficheFilm :titre="film.titre" :url="film.affiche_url" decorative />
      <h2 class="carte-film__titre">{{ film.titre }}</h2>
    </RouterLink>
    <p class="carte-film__details">
      {{ film.genre }} · {{ dureeLisible(film.duree_minutes) }} · {{ film.classification }}
    </p>
  </article>
</template>

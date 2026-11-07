<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AfficheFilm from '@/components/AfficheFilm.vue'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useProgrammationStore } from '@/stores/programmation'
import type { FilmAlAffiche } from '@/types/film'
import { dureeLisible } from '@/utils/format'

/** Fiche d'un film à l'affiche, ouverte depuis la liste des films. */
const props = defineProps<{ id: number }>()

const programmation = useProgrammationStore()
const film = ref<FilmAlAffiche | null>(null)
const chargement = ref(true)
const erreur = ref<string | null>(null)

watch(
  () => props.id,
  async (id) => {
    chargement.value = true
    erreur.value = null
    try {
      film.value = await programmation.chargerFilm(id)
      document.title = `${film.value.titre} – Le Grand Cinéma`
    } catch (e) {
      film.value = null
      if (e instanceof ErreurApi && e.statut === 404) {
        erreur.value = 'Ce film n’est plus à l’affiche.'
      } else {
        erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
      }
    } finally {
      chargement.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <main>
    <p class="fil-ariane">
      <RouterLink :to="{ name: 'films' }">Films à l'affiche</RouterLink>
    </p>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-else-if="chargement" role="status">Chargement du film…</p>

    <article v-else-if="film" class="fiche-film">
      <AfficheFilm :titre="film.titre" :url="film.affiche_url" />
      <div class="fiche-film__texte">
        <h1>{{ film.titre }}</h1>
        <dl class="profil">
          <dt>Genre</dt>
          <dd>{{ film.genre }}</dd>
          <dt>Durée</dt>
          <dd>{{ dureeLisible(film.duree_minutes) }}</dd>
          <dt>Classification</dt>
          <dd>{{ film.classification }}</dd>
          <dt>Langue originale</dt>
          <dd>{{ film.langue_originale ?? 'Non précisée' }}</dd>
        </dl>
        <h2>Synopsis</h2>
        <p class="fiche-film__synopsis">{{ film.synopsis }}</p>
        <p v-if="film.bande_annonce_url">
          <a :href="film.bande_annonce_url" target="_blank" rel="noopener noreferrer">
            Voir la bande-annonce<span class="visuellement-cache"> (nouvel onglet)</span>
          </a>
        </p>
      </div>
    </article>
  </main>
</template>

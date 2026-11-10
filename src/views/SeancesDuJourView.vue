<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AfficheFilm from '@/components/AfficheFilm.vue'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useProgrammationStore } from '@/stores/programmation'
import { LIBELLES_TYPE_SALLE } from '@/types/salle'
import type { SeancePublique } from '@/types/seance'
import { decalerJour, dureeLisible, heureDe, jourEnLettres, jourIso } from '@/utils/format'

const programmation = useProgrammationStore()
const aujourdhui = jourIso()
const chargement = ref(true)
const erreur = ref<string | null>(null)

async function charger() {
  // Une date effacée ou passée revient à aujourd'hui: les séances passées ne sont plus proposées.
  if (programmation.jour === '' || programmation.jour < aujourdhui) {
    programmation.jour = aujourdhui
  }
  chargement.value = true
  erreur.value = null
  try {
    await programmation.chargerSeances()
  } catch (e) {
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  } finally {
    chargement.value = false
  }
}

async function changerDeJour(nombre: number) {
  programmation.jour = decalerJour(programmation.jour, nombre)
  await charger()
}

function placesRestantes(seance: SeancePublique): string {
  const places = seance.places_restantes
  return places === 1 ? '1 place restante' : `${places} places restantes`
}

onMounted(charger)
</script>

<template>
  <main>
    <h1>Séances</h1>

    <div class="filtres">
      <div class="champ">
        <label for="seances-date">Date</label>
        <input
          id="seances-date"
          v-model="programmation.jour"
          type="date"
          :min="aujourdhui"
          @change="charger"
        />
      </div>
      <div class="filtres__jours">
        <button
          type="button"
          class="bouton-lien"
          :disabled="programmation.jour <= aujourdhui"
          @click="changerDeJour(-1)"
        >
          Jour précédent
        </button>
        <button type="button" class="bouton-lien" @click="changerDeJour(1)">Jour suivant</button>
      </div>
    </div>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-else-if="chargement" role="status">Chargement des séances…</p>
    <p v-else-if="programmation.seances.length === 0">
      Aucune séance n'est programmée le {{ jourEnLettres(programmation.jour) }}.
    </p>

    <template v-else>
      <p class="seances__jour">Séances du {{ jourEnLettres(programmation.jour) }}</p>
      <section
        v-for="groupe in programmation.seancesParFilm"
        :key="groupe.film.id"
        class="seances-film"
        :aria-labelledby="`film-${groupe.film.id}`"
      >
        <AfficheFilm :titre="groupe.film.titre" :url="groupe.film.affiche_url" decorative />
        <div>
          <h2 :id="`film-${groupe.film.id}`" class="seances-film__titre">
            <RouterLink :to="{ name: 'fiche-film', params: { id: groupe.film.id } }">
              {{ groupe.film.titre }}
            </RouterLink>
          </h2>
          <p class="carte-film__details">
            {{ groupe.film.genre }} · {{ dureeLisible(groupe.film.duree_minutes) }} ·
            {{ groupe.film.classification }}
          </p>
          <ul class="horaires">
            <li
              v-for="seance in groupe.seances"
              :key="seance.id"
              :class="['horaire', { 'horaire--complet': seance.complet }]"
            >
              <span class="horaire__heure">{{ heureDe(seance.debut) }}</span>
              <span class="horaire__version">{{ seance.langue.toUpperCase() }}</span>
              <span class="horaire__salle">
                {{ seance.salle.nom }} · {{ LIBELLES_TYPE_SALLE[seance.salle.type] }}
              </span>
              <span v-if="seance.complet" class="remplissage remplissage--complet">Complet</span>
              <template v-else>
                <span class="horaire__places">{{ placesRestantes(seance) }}</span>
                <span v-if="seance.bientot_complet" class="remplissage remplissage--bientot">
                  Bientôt complet
                </span>
                <RouterLink
                  class="horaire__reserver"
                  :to="{ name: 'plan-de-salle', params: { id: seance.id } }"
                  :aria-label="`Choisir ses places pour ${groupe.film.titre} à ${heureDe(seance.debut)}, ${seance.salle.nom}`"
                >
                  Choisir ses places
                </RouterLink>
              </template>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </main>
</template>

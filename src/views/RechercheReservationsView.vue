<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useRechercheReservationsStore } from '@/stores/rechercheReservations'
import { LIBELLES_STATUT_RESERVATION, libelleClient } from '@/types/reservation'
import { dateDe, heureDe, jourEnLettres, prixEnEuros } from '@/utils/format'

/**
 * Recherche d'une réservation au guichet (US-15): par numéro, nom ou adresse e-mail du client,
 * par séance, ou les deux. Chaque résultat mène au détail de la réservation.
 */
const store = useRechercheReservationsStore()
const { rediriger } = useSessionExpiree()

const chargement = ref(false)
const erreur = ref<string | null>(null)

const legende = computed(() =>
  store.total === 1 ? '1 réservation trouvée' : `${store.total} réservations trouvées`,
)

async function signaler(e: unknown): Promise<void> {
  if (!(await rediriger(e))) {
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  }
}

async function chargerSeances(): Promise<void> {
  try {
    await store.chargerSeances()
  } catch (e) {
    await signaler(e)
  }
}

async function rechercher(page = 1): Promise<void> {
  erreur.value = null
  if (store.recherche.trim() === '' && store.seance === null) {
    erreur.value =
      'Saisissez un numéro de réservation, un nom ou une adresse e-mail, ou choisissez une séance.'
    return
  }
  chargement.value = true
  try {
    await store.rechercher(page)
  } catch (e) {
    await signaler(e)
  } finally {
    chargement.value = false
  }
}

onMounted(chargerSeances)
</script>

<template>
  <main>
    <h1>Rechercher une réservation</h1>

    <form class="filtres" role="search" @submit.prevent="rechercher()">
      <div class="champ">
        <label for="recherche-texte">Numéro, nom ou adresse e-mail</label>
        <input
          id="recherche-texte"
          v-model="store.recherche"
          type="search"
          autocomplete="off"
          placeholder="R-7KX4M2PA, Durand…"
        />
      </div>
      <div class="champ">
        <label for="recherche-jour">Jour de la séance</label>
        <input id="recherche-jour" v-model="store.jour" type="date" @change="chargerSeances" />
      </div>
      <div class="champ">
        <label for="recherche-seance">Séance</label>
        <select id="recherche-seance" v-model="store.seance">
          <option :value="null">Toutes les séances</option>
          <option v-for="seance in store.seances" :key="seance.id" :value="seance.id">
            {{ heureDe(seance.debut) }} · {{ seance.film.titre }} · {{ seance.salle.nom }}
          </option>
        </select>
      </div>
      <button type="submit" class="bouton" :disabled="chargement">Rechercher</button>
    </form>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-else-if="chargement" role="status">Recherche en cours…</p>
    <p v-else-if="store.recherchee && store.resultats.length === 0" role="status">
      Aucune réservation ne correspond à cette recherche.
    </p>

    <div v-else-if="store.resultats.length > 0" class="tableau-defilant">
      <table class="tableau">
        <caption>
          {{
            legende
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Numéro</th>
            <th scope="col">Client</th>
            <th scope="col">Séance</th>
            <th scope="col">Places</th>
            <th scope="col">Montant</th>
            <th scope="col">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="reservation in store.resultats" :key="reservation.id">
            <th scope="row" class="tableau__numero">
              <RouterLink :to="{ name: 'reservation-guichet', params: { id: reservation.id } }">
                {{ reservation.numero }}
              </RouterLink>
            </th>
            <td>{{ libelleClient(reservation) }}</td>
            <td>
              {{ reservation.seance.film.titre }}<br />
              <span class="tableau__detail">
                {{ jourEnLettres(dateDe(reservation.seance.debut)) }} à
                {{ heureDe(reservation.seance.debut) }}, {{ reservation.seance.salle.nom }}
              </span>
            </td>
            <td>{{ reservation.places }}</td>
            <td>{{ prixEnEuros(reservation.montant_centimes) }}</td>
            <td>
              <span :class="['statut-reservation', `statut-reservation--${reservation.statut}`]">
                {{ LIBELLES_STATUT_RESERVATION[reservation.statut] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="store.dernierePage > 1" class="pagination" aria-label="Pages des résultats">
      <button
        type="button"
        class="bouton-lien"
        :disabled="store.page <= 1 || chargement"
        @click="rechercher(store.page - 1)"
      >
        Page précédente
      </button>
      <span>Page {{ store.page }} sur {{ store.dernierePage }}</span>
      <button
        type="button"
        class="bouton-lien"
        :disabled="store.page >= store.dernierePage || chargement"
        @click="rechercher(store.page + 1)"
      >
        Page suivante
      </button>
    </nav>
  </main>
</template>

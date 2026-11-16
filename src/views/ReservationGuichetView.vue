<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useRechercheReservationsStore } from '@/stores/rechercheReservations'
import {
  LIBELLES_CANAL,
  LIBELLES_STATUT_RESERVATION,
  libelleClient,
  libellePaiement,
  libellePlace,
  type ReservationAuGuichet,
} from '@/types/reservation'
import { dateDe, heureDe, jourEnLettres, prixEnEuros } from '@/utils/format'

/**
 * Détail d'une réservation au guichet (US-15): le client, la séance, le paiement, et pour
 * chaque place son tarif, son prix et l'état de son billet.
 */
const props = defineProps<{ id: number }>()

const store = useRechercheReservationsStore()
const { rediriger } = useSessionExpiree()

const reservation = ref<ReservationAuGuichet | null>(null)
const chargement = ref(true)
const erreur = ref<string | null>(null)

onMounted(async () => {
  try {
    reservation.value = await store.chargerReservation(props.id)
  } catch (e) {
    if (!(await rediriger(e))) {
      erreur.value =
        e instanceof ErreurApi && e.statut === 404
          ? 'Cette réservation est introuvable.'
          : e instanceof ErreurApi
            ? e.message
            : MESSAGE_ERREUR_INATTENDUE
    }
  } finally {
    chargement.value = false
  }
})
</script>

<template>
  <main>
    <p class="fil-ariane">
      <RouterLink :to="{ name: 'recherche-reservations' }">Retour à la recherche</RouterLink>
    </p>

    <p v-if="chargement" role="status">Chargement de la réservation…</p>
    <template v-else-if="reservation">
      <h1>Réservation {{ reservation.numero }}</h1>

      <dl class="profil">
        <dt>Statut</dt>
        <dd>
          <span :class="['statut-reservation', `statut-reservation--${reservation.statut}`]">
            {{ LIBELLES_STATUT_RESERVATION[reservation.statut] }}
          </span>
        </dd>
        <dt>Client</dt>
        <dd>
          {{ libelleClient(reservation)
          }}<template v-if="reservation.client">, {{ reservation.client.email }}</template>
        </dd>
        <dt>Vente</dt>
        <dd>{{ LIBELLES_CANAL[reservation.canal] }}</dd>
        <dt>Séance</dt>
        <dd>
          {{ reservation.seance.film.titre }},
          {{ jourEnLettres(dateDe(reservation.seance.debut)) }} à
          {{ heureDe(reservation.seance.debut) }}, {{ reservation.seance.salle.nom }},
          {{ reservation.seance.langue.toUpperCase() }}
        </dd>
        <dt>Paiement</dt>
        <dd class="reservation-guichet__paiement">{{ libellePaiement(reservation) }}</dd>
        <dt>Montant</dt>
        <dd>{{ prixEnEuros(reservation.montant_centimes) }}</dd>
      </dl>

      <div v-if="reservation.places.length > 0" class="tableau-defilant">
        <table class="tableau">
          <caption>
            Places et billets
          </caption>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Tarif</th>
              <th scope="col">Prix</th>
              <th scope="col">Billet</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="place in reservation.places" :key="place.id">
              <th scope="row">{{ libellePlace(place) }}<span v-if="place.pmr"> (PMR)</span></th>
              <td>{{ place.tarif ?? 'Non choisi' }}</td>
              <td>{{ prixEnEuros(place.prix_centimes) }}</td>
              <td>
                {{ place.utilise_at ? `Utilisé à ${heureDe(place.utilise_at)}` : 'Non utilisé' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="message">Les places de cette réservation ont été libérées: aucun billet.</p>
    </template>
    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
  </main>
</template>

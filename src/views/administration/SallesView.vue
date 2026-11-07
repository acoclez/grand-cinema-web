<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useGestionSeancesStore } from '@/stores/gestionSeances'
import { LIBELLES_TYPE_SALLE } from '@/types/salle'

const gestion = useGestionSeancesStore()
const { rediriger } = useSessionExpiree()
const chargement = ref(true)
const erreur = ref<string | null>(null)

const legende = computed(
  () =>
    `${gestion.salles.length} salles, ${gestion.totalPlaces.toLocaleString('fr-FR')} places au total`,
)

onMounted(async () => {
  try {
    await gestion.chargerSalles()
  } catch (e) {
    if (await rediriger(e)) {
      return
    }
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  } finally {
    chargement.value = false
  }
})
</script>

<template>
  <main>
    <h1>Salles</h1>
    <p>
      Les salles et leur plan de places reproduisent les salles du cinéma. Elles sont configurées à
      l’installation de l’application et servent à programmer les séances.
    </p>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-else-if="chargement" role="status">Chargement des salles…</p>

    <div v-else class="tableau-defilant">
      <table class="tableau">
        <caption>
          {{
            legende
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Salle</th>
            <th scope="col">Type</th>
            <th scope="col">Capacité</th>
            <th scope="col">Places du plan</th>
            <th scope="col">Dont places PMR</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="salle in gestion.salles" :key="salle.id">
            <th scope="row">{{ salle.nom }}</th>
            <td>{{ LIBELLES_TYPE_SALLE[salle.type] }}</td>
            <td>{{ salle.capacite }}</td>
            <td>{{ salle.places }}</td>
            <td>{{ salle.places_pmr }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup lang="ts">
import { libellePlace, type PlaceDuPlan, type TarifDuPlan } from '@/types/reservation'
import { prixEnEuros } from '@/utils/format'

/**
 * Un tarif par place: au guichet (US-16) comme avant le paiement en ligne (US-09).
 * Le modèle donne, pour chaque identifiant de place, l'identifiant du tarif choisi.
 */
defineProps<{
  places: Pick<PlaceDuPlan, 'id' | 'rangee' | 'numero'>[]
  tarifs: TarifDuPlan[]
  desactive?: boolean
}>()

const choix = defineModel<Record<number, number>>({ required: true })

function choisir(placeId: number, evenement: Event): void {
  const liste = evenement.target as HTMLSelectElement
  choix.value = { ...choix.value, [placeId]: Number(liste.value) }
}
</script>

<template>
  <ul class="panier__places">
    <li v-for="place in places" :key="place.id" class="panier__place">
      <label :for="`tarif-${place.id}`">Place {{ libellePlace(place) }}</label>
      <select
        :id="`tarif-${place.id}`"
        :value="choix[place.id]"
        :disabled="desactive"
        @change="choisir(place.id, $event)"
      >
        <option v-for="tarif in tarifs" :key="tarif.id" :value="tarif.id">
          {{ tarif.libelle }} · {{ prixEnEuros(tarif.prix_centimes) }}
        </option>
      </select>
    </li>
  </ul>
</template>

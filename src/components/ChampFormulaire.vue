<script setup lang="ts">
import { computed } from 'vue'

/** Champ de saisie obligatoire avec son libellé, une aide facultative et l'erreur de l'API. */
const props = defineProps<{
  id: string
  libelle: string
  type?: 'text' | 'email' | 'password'
  autocomplete?: string
  aide?: string
  erreur?: string
  minlength?: number
}>()

const valeur = defineModel<string>({ required: true })

// Les lecteurs d'écran annoncent l'aide et l'erreur avec le champ.
const descriptions = computed(
  () =>
    [props.aide ? `${props.id}-aide` : null, props.erreur ? `${props.id}-erreur` : null]
      .filter(Boolean)
      .join(' ') || undefined,
)
</script>

<template>
  <div class="champ">
    <label :for="id">{{ libelle }}</label>
    <input
      :id="id"
      v-model="valeur"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :minlength="minlength"
      required
      :aria-invalid="erreur ? 'true' : undefined"
      :aria-describedby="descriptions"
    />
    <p v-if="aide" :id="`${id}-aide`" class="champ__aide">{{ aide }}</p>
    <p v-if="erreur" :id="`${id}-erreur`" class="champ__erreur">{{ erreur }}</p>
  </div>
</template>

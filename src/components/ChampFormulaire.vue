<script setup lang="ts">
import { computed } from 'vue'

/**
 * Champ de formulaire avec son libellé, une aide facultative et l'erreur de l'API.
 * Zone de saisie d'une ligne par défaut, zone de texte avec multiligne,
 * liste de choix avec options, nombre entier avec numerique.
 * Le champ est obligatoire, sauf avec facultatif.
 */
const props = defineProps<{
  id: string
  libelle: string
  type?: 'text' | 'email' | 'password' | 'url'
  autocomplete?: string
  aide?: string
  erreur?: string
  minlength?: number
  numerique?: boolean
  multiligne?: boolean
  options?: readonly string[]
  facultatif?: boolean
}>()

const valeur = defineModel<string>({ required: true })

// Les lecteurs d'écran annoncent l'aide et l'erreur avec le champ.
const descriptions = computed(
  () =>
    [props.aide ? `${props.id}-aide` : null, props.erreur ? `${props.id}-erreur` : null]
      .filter(Boolean)
      .join(' ') || undefined,
)

// Attributs communs aux trois formes de champ.
const attributs = computed(() => ({
  id: props.id,
  required: !props.facultatif,
  'aria-invalid': props.erreur ? ('true' as const) : undefined,
  'aria-describedby': descriptions.value,
}))
</script>

<template>
  <div class="champ">
    <label :for="id">
      {{ libelle }}<span v-if="facultatif" class="champ__facultatif"> (facultatif)</span>
    </label>
    <textarea v-if="multiligne" v-model="valeur" v-bind="attributs" rows="5"></textarea>
    <select v-else-if="options" v-model="valeur" v-bind="attributs">
      <option value="" disabled>Choisir…</option>
      <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
    </select>
    <input
      v-else
      v-model="valeur"
      v-bind="attributs"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :minlength="minlength"
      :inputmode="numerique ? 'numeric' : undefined"
      :pattern="numerique ? '[0-9]*' : undefined"
    />
    <p v-if="aide" :id="`${id}-aide`" class="champ__aide">{{ aide }}</p>
    <p v-if="erreur" :id="`${id}-erreur`" class="champ__erreur">{{ erreur }}</p>
  </div>
</template>

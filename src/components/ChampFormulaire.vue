<script setup lang="ts">
import { computed } from 'vue'

import type { OptionChamp } from '@/types/formulaire'

/**
 * Champ de formulaire avec son libellé, une aide facultative et l'erreur de l'API.
 * Zone de saisie d'une ligne par défaut, zone de texte avec multiligne,
 * liste de choix avec options, nombre entier avec numerique, nombre à virgule avec decimal.
 * Le champ est obligatoire, sauf avec facultatif.
 */
const props = defineProps<{
  id: string
  libelle: string
  type?: 'text' | 'email' | 'password' | 'url' | 'date' | 'time'
  autocomplete?: string
  aide?: string
  erreur?: string
  minlength?: number
  numerique?: boolean
  decimal?: boolean
  multiligne?: boolean
  /** Textes simples (valeur = texte affiché) ou couples valeur et libellé. */
  options?: readonly (string | OptionChamp)[]
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
  required: !props.facultatif,
  'aria-invalid': props.erreur ? ('true' as const) : undefined,
  'aria-describedby': descriptions.value,
}))

const choix = computed<OptionChamp[]>(() =>
  (props.options ?? []).map((option) =>
    typeof option === 'string' ? { valeur: option, libelle: option } : option,
  ),
)

// Clavier adapté sur mobile: chiffres seuls, ou chiffres et virgule pour un prix.
const clavier = computed(() => {
  if (props.numerique) {
    return 'numeric'
  }
  return props.decimal ? 'decimal' : undefined
})
</script>

<template>
  <div class="champ">
    <label :for="id">
      {{ libelle }}<span v-if="facultatif" class="champ__facultatif"> (facultatif)</span>
    </label>
    <textarea v-if="multiligne" :id="id" v-model="valeur" v-bind="attributs" rows="5"></textarea>
    <select v-else-if="options" :id="id" v-model="valeur" v-bind="attributs">
      <option value="" :disabled="!facultatif">
        {{ facultatif ? 'Non précisé' : 'Choisir…' }}
      </option>
      <option v-for="option in choix" :key="option.valeur" :value="option.valeur">
        {{ option.libelle }}
      </option>
    </select>
    <input
      v-else
      :id="id"
      v-model="valeur"
      v-bind="attributs"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :minlength="minlength"
      :inputmode="clavier"
      :pattern="numerique ? '[0-9]*' : undefined"
    />
    <p v-if="aide" :id="`${id}-aide`" class="champ__aide">{{ aide }}</p>
    <p v-if="erreur" :id="`${id}-erreur`" class="champ__erreur">{{ erreur }}</p>
  </div>
</template>

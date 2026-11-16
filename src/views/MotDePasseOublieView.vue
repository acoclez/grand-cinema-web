<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()

const email = ref('')
const confirmation = ref<string | null>(null)

async function demanderLien() {
  await envoyer(async () => {
    confirmation.value = await auth.demanderLien(email.value)
  })
}
</script>

<template>
  <main class="page-formulaire">
    <h1>Mot de passe oublié</h1>

    <template v-if="confirmation">
      <p class="message message--succes" role="status">{{ confirmation }}</p>
      <p><RouterLink :to="{ name: 'connexion' }">Retour à la connexion</RouterLink></p>
    </template>

    <template v-else>
      <p>Indiquez l'adresse e-mail de votre compte pour recevoir un lien de réinitialisation.</p>
      <p v-if="erreurGenerale" class="message message--erreur" role="alert">
        {{ erreurGenerale }}
      </p>

      <form @submit.prevent="demanderLien">
        <ChampFormulaire
          id="oubli-email"
          v-model="email"
          libelle="Adresse e-mail"
          type="email"
          autocomplete="email"
          :erreur="erreurs.email"
        />
        <button type="submit" class="bouton" :disabled="envoiEnCours">Recevoir le lien</button>
      </form>

      <p><RouterLink :to="{ name: 'connexion' }">Retour à la connexion</RouterLink></p>
    </template>
  </main>
</template>

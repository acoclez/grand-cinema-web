<script setup lang="ts">
import { onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Le message, par exemple la confirmation de suppression du compte, ne s'affiche qu'une fois.
onUnmounted(() => {
  auth.annonce = null
})
</script>

<template>
  <main>
    <h1>Le Grand Cinéma</h1>
    <p v-if="auth.annonce" class="message message--succes" role="status">{{ auth.annonce }}</p>
    <p v-if="auth.utilisateur">Bonjour {{ auth.utilisateur.prenom }}, bienvenue au Grand Cinéma.</p>
    <p v-else>
      <RouterLink :to="{ name: 'inscription' }">Créez votre compte</RouterLink> pour réserver vos
      places et retrouver vos billets.
    </p>
    <p class="accueil__liens">
      <RouterLink :to="{ name: 'films' }" class="bouton">Voir les films à l'affiche</RouterLink>
      <RouterLink :to="{ name: 'seances' }" class="bouton">Voir les séances du jour</RouterLink>
    </p>
  </main>
</template>

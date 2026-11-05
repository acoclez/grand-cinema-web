<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <main>
    <h1>Le Grand Cinéma</h1>
    <p v-if="auth.utilisateur">Bonjour {{ auth.utilisateur.prenom }}, bienvenue au Grand Cinéma.</p>
    <p v-else>
      <RouterLink :to="{ name: 'inscription' }">Créez votre compte</RouterLink> pour réserver vos
      places et retrouver vos billets.
    </p>
  </main>
</template>

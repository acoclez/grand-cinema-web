<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const erreur = ref<string | null>(null)

// Le profil est relu à chaque visite, ce qui vérifie aussi que le jeton est encore accepté.
onMounted(async () => {
  try {
    await auth.chargerProfil()
  } catch (e) {
    if (e instanceof ErreurApi && e.statut === 401) {
      auth.fermerSession()
      await router.push({ name: 'connexion', query: { redirection: route.fullPath } })
      return
    }
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  }
})
</script>

<template>
  <main>
    <h1>Mon espace</h1>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>

    <template v-if="auth.utilisateur">
      <p>Bonjour {{ auth.utilisateur.prenom }}.</p>
      <dl class="profil">
        <dt>Nom</dt>
        <dd>{{ auth.utilisateur.prenom }} {{ auth.utilisateur.nom }}</dd>
        <dt>Adresse e-mail</dt>
        <dd>{{ auth.utilisateur.email }}</dd>
        <dt>Actualités par e-mail</dt>
        <dd>{{ auth.utilisateur.consentement_emails ? 'Oui' : 'Non' }}</dd>
      </dl>
    </template>
  </main>
</template>

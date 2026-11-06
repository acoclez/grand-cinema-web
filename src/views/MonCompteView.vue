<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { rediriger } = useSessionExpiree()
const erreur = ref<string | null>(null)

// Le profil est relu à chaque visite, ce qui vérifie aussi que le jeton est encore accepté.
onMounted(async () => {
  try {
    await auth.chargerProfil()
  } catch (e) {
    if (await rediriger(e)) {
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

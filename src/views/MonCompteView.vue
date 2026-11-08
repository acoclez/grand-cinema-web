<script setup lang="ts">
import { onMounted, ref } from 'vue'

import FormulaireProfil from '@/components/FormulaireProfil.vue'
import SuppressionCompte from '@/components/SuppressionCompte.vue'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { rediriger } = useSessionExpiree()
const chargement = ref(true)
const erreur = ref<string | null>(null)

// Le profil est relu à chaque visite, ce qui vérifie aussi que le jeton est encore accepté.
// Le formulaire s'ouvre ensuite, avec les informations à jour.
onMounted(async () => {
  try {
    await auth.chargerProfil()
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
  <main class="page-formulaire">
    <h1>Mon espace</h1>

    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    <p v-if="chargement" role="status">Chargement de votre profil…</p>

    <template v-else-if="auth.utilisateur">
      <p>Bonjour {{ auth.utilisateur.prenom }}.</p>
      <FormulaireProfil :utilisateur="auth.utilisateur" />
      <SuppressionCompte v-if="auth.utilisateur.role === 'spectateur'" />
    </template>
  </main>
</template>

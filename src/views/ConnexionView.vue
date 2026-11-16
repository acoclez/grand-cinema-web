<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { destinationApresConnexion } from '@/router/redirection'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()

const email = ref('')
const motDePasse = ref('')

async function seConnecter() {
  if (await envoyer(() => auth.connecter(email.value, motDePasse.value))) {
    await router.push(destinationApresConnexion(route.query.redirection))
  }
}
</script>

<template>
  <main class="page-formulaire">
    <h1>Connexion</h1>

    <p v-if="route.query.motDePasseModifie" class="message message--succes" role="status">
      Votre mot de passe a été modifié. Vous pouvez vous connecter.
    </p>
    <p v-if="erreurGenerale" class="message message--erreur" role="alert">{{ erreurGenerale }}</p>

    <form @submit.prevent="seConnecter">
      <ChampFormulaire
        id="connexion-email"
        v-model="email"
        libelle="Adresse e-mail"
        type="email"
        autocomplete="email"
        :erreur="erreurs.email"
      />
      <ChampFormulaire
        id="connexion-mot-de-passe"
        v-model="motDePasse"
        libelle="Mot de passe"
        type="password"
        autocomplete="current-password"
        :erreur="erreurs.password"
      />
      <button type="submit" class="bouton" :disabled="envoiEnCours">Se connecter</button>
    </form>

    <p><RouterLink :to="{ name: 'mot-de-passe-oublie' }">Mot de passe oublié ?</RouterLink></p>
    <p>
      Pas encore de compte ? <RouterLink :to="{ name: 'inscription' }">Créer un compte</RouterLink>
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()

// Le lien reçu par e-mail porte le jeton de réinitialisation et l'adresse du compte.
const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''

const motDePasse = ref('')
const confirmation = ref('')

// Lien expiré ou déjà utilisé: l'API renvoie l'erreur sur le champ token.
const erreurDuLien = computed(() => erreurs.value.token ?? erreurs.value.email ?? null)

async function changerMotDePasse() {
  const reussi = await envoyer(() =>
    auth.reinitialiser({
      token,
      email,
      password: motDePasse.value,
      password_confirmation: confirmation.value,
    }),
  )
  if (reussi) {
    await router.push({ name: 'connexion', query: { motDePasseModifie: '1' } })
  }
}
</script>

<template>
  <main class="page-formulaire">
    <h1>Nouveau mot de passe</h1>

    <template v-if="token && email">
      <p>Compte : {{ email }}</p>
      <p v-if="erreurGenerale" class="message message--erreur" role="alert">
        {{ erreurGenerale }}
      </p>
      <div v-if="erreurDuLien" class="message message--erreur" role="alert">
        <p>{{ erreurDuLien }}</p>
        <RouterLink :to="{ name: 'mot-de-passe-oublie' }">Demander un nouveau lien</RouterLink>
      </div>

      <form @submit.prevent="changerMotDePasse">
        <ChampFormulaire
          id="reinitialisation-mot-de-passe"
          v-model="motDePasse"
          libelle="Nouveau mot de passe"
          type="password"
          autocomplete="new-password"
          aide="Au moins 12 caractères."
          :minlength="12"
          :erreur="erreurs.password"
        />
        <ChampFormulaire
          id="reinitialisation-confirmation"
          v-model="confirmation"
          libelle="Confirmation du mot de passe"
          type="password"
          autocomplete="new-password"
          :minlength="12"
        />
        <button type="submit" class="bouton" :disabled="envoiEnCours">
          Enregistrer le mot de passe
        </button>
      </form>
    </template>

    <div v-else class="message message--erreur" role="alert">
      <p>Ce lien de réinitialisation est incomplet.</p>
      <RouterLink :to="{ name: 'mot-de-passe-oublie' }">Demander un nouveau lien</RouterLink>
    </div>
  </main>
</template>

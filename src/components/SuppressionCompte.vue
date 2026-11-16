<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useAuthStore } from '@/stores/auth'

/** Droit à l'effacement: le spectateur supprime son compte, confirmé par son mot de passe (US-06). */
const auth = useAuthStore()
const router = useRouter()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()
const confirmationOuverte = ref(false)
const motDePasse = ref('')

async function ouvrir() {
  confirmationOuverte.value = true
  await nextTick()
  document.getElementById('suppression-mot-de-passe')?.focus()
}

function annuler() {
  confirmationOuverte.value = false
  motDePasse.value = ''
  erreurs.value = {}
}

async function supprimer() {
  if (await envoyer(() => auth.supprimerCompte(motDePasse.value))) {
    await router.push({ name: 'accueil' })
  }
}
</script>

<template>
  <section class="zone-sensible" aria-labelledby="titre-suppression">
    <h2 id="titre-suppression">Supprimer mon compte</h2>
    <p>
      Vos données personnelles seront effacées et vous ne pourrez plus vous connecter. Les billets
      déjà achetés restent valables. Vos réservations passées restent dans les statistiques du
      cinéma, sans lien avec vous.
    </p>

    <button v-if="!confirmationOuverte" type="button" class="bouton bouton--danger" @click="ouvrir">
      Supprimer mon compte
    </button>

    <form v-else @submit.prevent="supprimer">
      <p v-if="erreurGenerale" class="message message--erreur" role="alert">
        {{ erreurGenerale }}
      </p>
      <ChampFormulaire
        id="suppression-mot-de-passe"
        v-model="motDePasse"
        libelle="Confirmez avec votre mot de passe"
        type="password"
        autocomplete="current-password"
        :erreur="erreurs.password"
      />
      <p class="zone-sensible__actions">
        <button type="submit" class="bouton bouton--danger" :disabled="envoiEnCours">
          Supprimer définitivement mon compte
        </button>
        <button type="button" class="bouton-lien" @click="annuler">Annuler</button>
      </p>
    </form>
  </section>
</template>

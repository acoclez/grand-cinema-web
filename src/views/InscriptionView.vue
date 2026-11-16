<script setup lang="ts">
import { reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useAuthStore } from '@/stores/auth'
import type { DonneesInscription } from '@/types/compte'

const auth = useAuthStore()
const router = useRouter()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()

// Les deux cases sont décochées par défaut: le consentement doit être un choix du visiteur.
const donnees = reactive<DonneesInscription>({
  prenom: '',
  nom: '',
  email: '',
  password: '',
  password_confirmation: '',
  consentement_emails: false,
  conditions_acceptees: false,
})

async function creerCompte() {
  if (await envoyer(() => auth.inscrire(donnees))) {
    await router.push({ name: 'mon-compte' })
  }
}
</script>

<template>
  <main class="page-formulaire">
    <h1>Créer un compte</h1>

    <p v-if="erreurGenerale" class="message message--erreur" role="alert">{{ erreurGenerale }}</p>

    <form @submit.prevent="creerCompte">
      <ChampFormulaire
        id="inscription-prenom"
        v-model="donnees.prenom"
        libelle="Prénom"
        autocomplete="given-name"
        :erreur="erreurs.prenom"
      />
      <ChampFormulaire
        id="inscription-nom"
        v-model="donnees.nom"
        libelle="Nom"
        autocomplete="family-name"
        :erreur="erreurs.nom"
      />
      <ChampFormulaire
        id="inscription-email"
        v-model="donnees.email"
        libelle="Adresse e-mail"
        type="email"
        autocomplete="email"
        :erreur="erreurs.email"
      />
      <ChampFormulaire
        id="inscription-mot-de-passe"
        v-model="donnees.password"
        libelle="Mot de passe"
        type="password"
        autocomplete="new-password"
        aide="Au moins 12 caractères."
        :minlength="12"
        :erreur="erreurs.password"
      />
      <ChampFormulaire
        id="inscription-confirmation"
        v-model="donnees.password_confirmation"
        libelle="Confirmation du mot de passe"
        type="password"
        autocomplete="new-password"
        :minlength="12"
      />

      <div class="case">
        <input
          id="inscription-consentement"
          v-model="donnees.consentement_emails"
          type="checkbox"
        />
        <label for="inscription-consentement">
          J'accepte de recevoir les actualités du Grand Cinéma par e-mail.
        </label>
      </div>
      <div class="case">
        <input
          id="inscription-conditions"
          v-model="donnees.conditions_acceptees"
          type="checkbox"
          required
          :aria-invalid="erreurs.conditions_acceptees ? 'true' : undefined"
          :aria-describedby="
            erreurs.conditions_acceptees ? 'inscription-conditions-erreur' : undefined
          "
        />
        <label for="inscription-conditions">J'accepte les conditions générales de vente.</label>
        <p
          v-if="erreurs.conditions_acceptees"
          id="inscription-conditions-erreur"
          class="champ__erreur"
        >
          {{ erreurs.conditions_acceptees }}
        </p>
      </div>

      <button type="submit" class="bouton" :disabled="envoiEnCours">Créer mon compte</button>
    </form>

    <p>Déjà un compte ? <RouterLink :to="{ name: 'connexion' }">Se connecter</RouterLink></p>
  </main>
</template>

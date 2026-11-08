<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useAuthStore } from '@/stores/auth'
import type { DonneesProfil, Utilisateur } from '@/types/compte'
import { OPTIONS_PAYS } from '@/utils/pays'

/** Coordonnées, pays de résidence et consentement aux e-mails du compte connecté (US-06). */
const props = defineProps<{ utilisateur: Utilisateur }>()

const auth = useAuthStore()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()
const confirmation = ref<string | null>(null)

const donnees = reactive<DonneesProfil>({
  prenom: props.utilisateur.prenom,
  nom: props.utilisateur.nom,
  email: props.utilisateur.email,
  pays_residence: props.utilisateur.pays_residence,
  consentement_emails: props.utilisateur.consentement_emails,
})

// La liste de choix travaille avec du texte: '' pour « Non précisé ».
const pays = computed({
  get: () => donnees.pays_residence ?? '',
  set: (valeur: string) => {
    donnees.pays_residence = valeur === '' ? null : valeur
  },
})

async function enregistrer() {
  confirmation.value = null
  if (await envoyer(() => auth.modifierProfil(donnees))) {
    confirmation.value = 'Vos informations sont enregistrées.'
  }
}
</script>

<template>
  <section aria-labelledby="titre-informations">
    <h2 id="titre-informations">Mes informations</h2>

    <p v-if="confirmation" class="message message--succes" role="status">{{ confirmation }}</p>
    <p v-if="erreurGenerale" class="message message--erreur" role="alert">{{ erreurGenerale }}</p>

    <form @submit.prevent="enregistrer">
      <ChampFormulaire
        id="profil-prenom"
        v-model="donnees.prenom"
        libelle="Prénom"
        autocomplete="given-name"
        :erreur="erreurs.prenom"
      />
      <ChampFormulaire
        id="profil-nom"
        v-model="donnees.nom"
        libelle="Nom"
        autocomplete="family-name"
        :erreur="erreurs.nom"
      />
      <ChampFormulaire
        id="profil-email"
        v-model="donnees.email"
        libelle="Adresse e-mail"
        type="email"
        autocomplete="email"
        :erreur="erreurs.email"
      />
      <ChampFormulaire
        id="profil-pays"
        v-model="pays"
        libelle="Pays de résidence"
        :options="OPTIONS_PAYS"
        facultatif
        aide="Sert uniquement à connaître la part des spectateurs venus de l'étranger."
        :erreur="erreurs.pays_residence"
      />
      <div class="case">
        <input id="profil-consentement" v-model="donnees.consentement_emails" type="checkbox" />
        <label for="profil-consentement">
          J'accepte de recevoir les actualités du Grand Cinéma par e-mail. Je peux retirer mon
          accord à tout moment.
        </label>
      </div>
      <p>
        <button type="submit" class="bouton" :disabled="envoiEnCours">Enregistrer</button>
      </p>
    </form>
  </section>
</template>

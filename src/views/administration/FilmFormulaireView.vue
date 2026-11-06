<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useGestionFilmsStore } from '@/stores/gestionFilms'
import { CLASSIFICATIONS, type DonneesFilm, type Film } from '@/types/film'

/** Création d'un film sans identifiant, modification d'un film existant avec. */
const props = defineProps<{ id?: number }>()

const gestion = useGestionFilmsStore()
const router = useRouter()
const { rediriger } = useSessionExpiree()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()

// Les champs de saisie sont des textes, la durée est convertie en nombre à l'envoi.
const saisie = reactive({
  titre: '',
  synopsis: '',
  duree_minutes: '',
  genre: '',
  classification: '',
  langue_originale: '',
  affiche_url: '',
  bande_annonce_url: '',
})

const modification = computed(() => props.id !== undefined)
const chargement = ref(false)
const erreurChargement = ref<string | null>(null)

function remplir(film: Film) {
  Object.assign(saisie, {
    titre: film.titre,
    synopsis: film.synopsis,
    duree_minutes: String(film.duree_minutes),
    genre: film.genre,
    classification: film.classification,
    langue_originale: film.langue_originale ?? '',
    affiche_url: film.affiche_url ?? '',
    bande_annonce_url: film.bande_annonce_url ?? '',
  })
}

// Un champ facultatif laissé vide est envoyé comme null, une durée vide aussi:
// l'API signale alors le champ obligatoire.
function donnees(): DonneesFilm {
  const duree = saisie.duree_minutes.trim()
  return {
    titre: saisie.titre,
    synopsis: saisie.synopsis,
    duree_minutes: duree === '' ? null : Number(duree),
    genre: saisie.genre,
    classification: saisie.classification as DonneesFilm['classification'],
    langue_originale: saisie.langue_originale,
    affiche_url: saisie.affiche_url.trim() || null,
    bande_annonce_url: saisie.bande_annonce_url.trim() || null,
  }
}

function messageDeChargement(erreur: unknown): string {
  if (!(erreur instanceof ErreurApi)) {
    return MESSAGE_ERREUR_INATTENDUE
  }
  return erreur.statut === 404 ? 'Ce film n’existe pas.' : erreur.message
}

watch(
  () => props.id,
  async (id) => {
    if (id === undefined) {
      return
    }
    chargement.value = true
    erreurChargement.value = null
    try {
      remplir(await gestion.charger(id))
    } catch (e) {
      if (await rediriger(e)) {
        return
      }
      erreurChargement.value = messageDeChargement(e)
    } finally {
      chargement.value = false
    }
  },
  { immediate: true },
)

async function enregistrer() {
  const id = props.id
  const reussi = await envoyer(() =>
    id === undefined ? gestion.creer(donnees()) : gestion.modifier(id, donnees()),
  )
  if (reussi) {
    await router.push({ name: 'admin-films' })
  }
}
</script>

<template>
  <main class="page-formulaire">
    <h1>{{ modification ? 'Modifier un film' : 'Ajouter un film' }}</h1>

    <p v-if="erreurChargement" class="message message--erreur" role="alert">
      {{ erreurChargement }}
      <RouterLink :to="{ name: 'admin-films' }">Retour à la liste des films</RouterLink>
    </p>
    <p v-else-if="chargement" role="status">Chargement du film…</p>

    <template v-else>
      <p v-if="erreurGenerale" class="message message--erreur" role="alert">
        {{ erreurGenerale }}
      </p>

      <form @submit.prevent="enregistrer">
        <ChampFormulaire
          id="film-titre"
          v-model="saisie.titre"
          libelle="Titre"
          :erreur="erreurs.titre"
        />
        <ChampFormulaire
          id="film-synopsis"
          v-model="saisie.synopsis"
          libelle="Synopsis"
          multiligne
          :erreur="erreurs.synopsis"
        />
        <ChampFormulaire
          id="film-duree"
          v-model="saisie.duree_minutes"
          libelle="Durée"
          numerique
          aide="En minutes, par exemple 112."
          :erreur="erreurs.duree_minutes"
        />
        <ChampFormulaire
          id="film-genre"
          v-model="saisie.genre"
          libelle="Genre"
          :erreur="erreurs.genre"
        />
        <ChampFormulaire
          id="film-classification"
          v-model="saisie.classification"
          libelle="Classification"
          :options="CLASSIFICATIONS"
          :erreur="erreurs.classification"
        />
        <ChampFormulaire
          id="film-langue"
          v-model="saisie.langue_originale"
          libelle="Langue originale"
          aide="Langue de tournage, par exemple Anglais. La version projetée (VO ou VF) se choisit sur chaque séance."
          :erreur="erreurs.langue_originale"
        />
        <ChampFormulaire
          id="film-affiche"
          v-model="saisie.affiche_url"
          libelle="Affiche"
          type="url"
          facultatif
          aide="Adresse https de l’image."
          :erreur="erreurs.affiche_url"
        />
        <ChampFormulaire
          id="film-bande-annonce"
          v-model="saisie.bande_annonce_url"
          libelle="Bande-annonce"
          type="url"
          facultatif
          aide="Adresse https de la vidéo, par exemple sur YouTube."
          :erreur="erreurs.bande_annonce_url"
        />

        <div class="actions">
          <button type="submit" class="bouton" :disabled="envoiEnCours">
            {{ modification ? 'Enregistrer les modifications' : 'Ajouter le film' }}
          </button>
          <RouterLink :to="{ name: 'admin-films' }">Annuler</RouterLink>
        </div>
      </form>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import ChampFormulaire from '@/components/ChampFormulaire.vue'
import { useFormulaire } from '@/composables/useFormulaire'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useGestionSeancesStore } from '@/stores/gestionSeances'
import type { Film } from '@/types/film'
import type { OptionChamp } from '@/types/formulaire'
import type { Salle } from '@/types/salle'
import { LANGUES_SEANCE, type DonneesSeance, type Seance } from '@/types/seance'
import { centimesDe, dateDe, heureDe, saisieDePrix } from '@/utils/format'

/** Programmation d'une séance sans identifiant, modification d'une séance existante avec. */
const props = defineProps<{ id?: number }>()

const gestion = useGestionSeancesStore()
const router = useRouter()
const { rediriger } = useSessionExpiree()
const { envoiEnCours, erreurGenerale, erreurs, envoyer } = useFormulaire()

// Les champs de saisie sont des textes. Les identifiants et les prix sont convertis à l'envoi.
const saisie = reactive({ film_id: '', salle_id: '', date: gestion.jour, heure: '', langue: '' })

interface LigneTarif {
  cle: number
  libelle: string
  prix: string
}

let prochaineCle = 0
function ligne(libelle = '', prix = ''): LigneTarif {
  prochaineCle += 1
  return { cle: prochaineCle, libelle, prix }
}

// Tarifs proposés pour une nouvelle séance, modifiables avant l'enregistrement.
const tarifs = ref<LigneTarif[]>([
  ligne('Plein', '9,50'),
  ligne('Réduit', '7,00'),
  ligne('Enfant', '5,50'),
])

const films = ref<Film[]>([])
const salles = ref<Salle[]>([])
const modification = computed(() => props.id !== undefined)
const chargement = ref(true)
const erreurChargement = ref<string | null>(null)
const verrouillee = ref(false)

const optionsFilms = computed<OptionChamp[]>(() =>
  films.value.map((film) => ({ valeur: String(film.id), libelle: film.titre })),
)
const optionsSalles = computed<OptionChamp[]>(() =>
  salles.value.map((salle) => ({
    valeur: String(salle.id),
    libelle: `${salle.nom} (${salle.capacite} places)`,
  })),
)

function remplir(seance: Seance) {
  // Le film d'une séance peut avoir été archivé: il reste proposé pour cette séance.
  if (!films.value.some((film) => film.id === seance.film.id)) {
    films.value = [...films.value, { ...seance.film } as Film]
  }
  Object.assign(saisie, {
    film_id: String(seance.film.id),
    salle_id: String(seance.salle.id),
    date: dateDe(seance.debut),
    heure: heureDe(seance.debut),
    langue: seance.langue,
  })
  tarifs.value = seance.tarifs.map((tarif) =>
    ligne(tarif.libelle, saisieDePrix(tarif.prix_centimes)),
  )
  verrouillee.value = seance.places_vendues > 0
}

function donnees(): DonneesSeance {
  return {
    film_id: saisie.film_id === '' ? null : Number(saisie.film_id),
    salle_id: saisie.salle_id === '' ? null : Number(saisie.salle_id),
    // Sans date ou sans heure, l'API demande de les indiquer.
    debut: saisie.date && saisie.heure ? `${saisie.date}T${saisie.heure}` : '',
    langue: saisie.langue as DonneesSeance['langue'],
    tarifs: tarifs.value.map((tarif) => ({
      libelle: tarif.libelle.trim(),
      prix_centimes: centimesDe(tarif.prix),
    })),
  }
}

function ajouterTarif() {
  tarifs.value.push(ligne())
}

function retirerTarif(cle: number) {
  tarifs.value = tarifs.value.filter((tarif) => tarif.cle !== cle)
}

function messageDeChargement(erreur: unknown): string {
  if (!(erreur instanceof ErreurApi)) {
    return MESSAGE_ERREUR_INATTENDUE
  }
  return erreur.statut === 404 ? 'Cette séance n’existe pas.' : erreur.message
}

watch(
  () => props.id,
  async (id) => {
    chargement.value = true
    erreurChargement.value = null
    try {
      const [listeFilms, listeSalles, seance] = await Promise.all([
        gestion.chargerFilms(),
        gestion.chargerSalles(),
        id === undefined ? Promise.resolve(null) : gestion.charger(id),
      ])
      films.value = listeFilms
      salles.value = listeSalles
      if (seance) {
        remplir(seance)
      }
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
    await router.push({ name: 'admin-seances' })
  }
}
</script>

<template>
  <main class="page-formulaire">
    <h1>{{ modification ? 'Modifier une séance' : 'Programmer une séance' }}</h1>

    <p v-if="erreurChargement" class="message message--erreur" role="alert">
      {{ erreurChargement }}
      <RouterLink :to="{ name: 'admin-seances' }">Retour aux séances</RouterLink>
    </p>
    <p v-else-if="chargement" role="status">Chargement…</p>
    <p v-else-if="verrouillee" class="message message--erreur" role="alert">
      Des places sont déjà vendues pour cette séance : elle ne peut plus être modifiée.
      <RouterLink :to="{ name: 'admin-seances' }">Retour aux séances</RouterLink>
    </p>

    <template v-else>
      <p v-if="erreurGenerale" class="message message--erreur" role="alert">
        {{ erreurGenerale }}
      </p>

      <form @submit.prevent="enregistrer">
        <ChampFormulaire
          id="seance-film"
          v-model="saisie.film_id"
          libelle="Film"
          :options="optionsFilms"
          aide="Seuls les films à l’affiche sont proposés."
          :erreur="erreurs.film_id"
        />
        <ChampFormulaire
          id="seance-salle"
          v-model="saisie.salle_id"
          libelle="Salle"
          :options="optionsSalles"
          :erreur="erreurs.salle_id"
        />
        <ChampFormulaire
          id="seance-date"
          v-model="saisie.date"
          libelle="Date"
          type="date"
          :erreur="erreurs.debut"
        />
        <ChampFormulaire
          id="seance-heure"
          v-model="saisie.heure"
          libelle="Heure de début"
          type="time"
          aide="Heure de Paris."
        />
        <ChampFormulaire
          id="seance-langue"
          v-model="saisie.langue"
          libelle="Version"
          :options="LANGUES_SEANCE"
          :erreur="erreurs.langue"
        />

        <fieldset
          class="tarifs"
          :aria-describedby="erreurs.tarifs ? 'seance-tarifs-erreur' : undefined"
        >
          <legend>Tarifs</legend>
          <p v-if="erreurs.tarifs" id="seance-tarifs-erreur" class="champ__erreur">
            {{ erreurs.tarifs }}
          </p>
          <div v-for="(tarif, index) in tarifs" :key="tarif.cle" class="tarifs__ligne">
            <ChampFormulaire
              :id="`seance-tarif-${index}-libelle`"
              v-model="tarif.libelle"
              :libelle="`Libellé du tarif ${index + 1}`"
              :erreur="erreurs[`tarifs.${index}.libelle`]"
            />
            <ChampFormulaire
              :id="`seance-tarif-${index}-prix`"
              v-model="tarif.prix"
              :libelle="`Prix du tarif ${index + 1} (€)`"
              decimal
              :erreur="erreurs[`tarifs.${index}.prix_centimes`]"
            />
            <button
              type="button"
              class="bouton-lien"
              :disabled="tarifs.length === 1"
              :aria-label="`Retirer le tarif ${index + 1}`"
              @click="retirerTarif(tarif.cle)"
            >
              Retirer
            </button>
          </div>
          <button type="button" class="bouton-lien" @click="ajouterTarif">Ajouter un tarif</button>
        </fieldset>

        <div class="actions">
          <button type="submit" class="bouton" :disabled="envoiEnCours">
            {{ modification ? 'Enregistrer les modifications' : 'Enregistrer en brouillon' }}
          </button>
          <RouterLink :to="{ name: 'admin-seances' }">Annuler</RouterLink>
        </div>
      </form>
    </template>
  </main>
</template>

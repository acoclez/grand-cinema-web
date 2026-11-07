<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { useGestionSeancesStore } from '@/stores/gestionSeances'
import type { Seance } from '@/types/seance'
import { decalerJour, heureDe, jourEnLettres, prixEnEuros } from '@/utils/format'

const gestion = useGestionSeancesStore()
const { rediriger } = useSessionExpiree()
const chargement = ref(true)
const actionEnCours = ref(false)
const erreur = ref<string | null>(null)

// La liste de choix travaille avec du texte: '' pour toutes les salles.
const salleChoisie = computed({
  get: () => (gestion.salleId === null ? '' : String(gestion.salleId)),
  set: (valeur: string) => {
    gestion.salleId = valeur === '' ? null : Number(valeur)
  },
})

/** Exécute un appel à l'API et affiche son erreur éventuelle, par exemple un refus 409. */
async function executer(action: () => Promise<unknown>) {
  erreur.value = null
  try {
    await action()
  } catch (e) {
    if (await rediriger(e)) {
      return
    }
    gestion.annonce = null
    erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
  }
}

async function charger() {
  chargement.value = true
  await executer(() => gestion.chargerListe())
  chargement.value = false
}

async function changerDeFiltre() {
  gestion.annonce = null
  await charger()
}

async function changerDeJour(nombre: number) {
  gestion.jour = decalerJour(gestion.jour, nombre)
  await changerDeFiltre()
}

async function agir(action: () => Promise<void>) {
  actionEnCours.value = true
  await executer(action)
  actionEnCours.value = false
}

const legende = computed(() => `Séances du ${jourEnLettres(gestion.jour)}`)

function intitule(seance: Seance): string {
  return `${seance.film.titre} à ${heureDe(seance.debut)}`
}

async function depublier(seance: Seance) {
  const confirme = window.confirm(
    `Dépublier « ${intitule(seance)} » ? La séance ne sera plus visible sur le site.`,
  )
  if (confirme) {
    await agir(() => gestion.depublier(seance))
  }
}

async function supprimer(seance: Seance) {
  const confirme = window.confirm(`Supprimer définitivement le brouillon « ${intitule(seance)} » ?`)
  if (confirme) {
    await agir(() => gestion.supprimer(seance))
  }
}

onMounted(async () => {
  await Promise.all([executer(() => gestion.chargerSalles()), charger()])
})
// Le message de confirmation ne s'affiche qu'une fois.
onUnmounted(() => {
  gestion.annonce = null
})
</script>

<template>
  <main>
    <div class="titre-page">
      <h1>Séances</h1>
      <RouterLink :to="{ name: 'admin-seance-nouvelle' }" class="bouton">
        Programmer une séance
      </RouterLink>
    </div>

    <p v-if="gestion.annonce" class="message message--succes" role="status">
      {{ gestion.annonce }}
    </p>
    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>

    <div class="filtres">
      <div class="champ">
        <label for="seances-jour">Jour</label>
        <input id="seances-jour" v-model="gestion.jour" type="date" @change="changerDeFiltre" />
      </div>
      <div class="champ">
        <label for="seances-salle">Salle</label>
        <select id="seances-salle" v-model="salleChoisie" @change="changerDeFiltre">
          <option value="">Toutes les salles</option>
          <option v-for="salle in gestion.salles" :key="salle.id" :value="String(salle.id)">
            {{ salle.nom }}
          </option>
        </select>
      </div>
      <div class="filtres__jours">
        <button type="button" class="bouton-lien" @click="changerDeJour(-1)">Jour précédent</button>
        <button type="button" class="bouton-lien" @click="changerDeJour(1)">Jour suivant</button>
      </div>
    </div>

    <p v-if="chargement" role="status">Chargement des séances…</p>
    <p v-else-if="gestion.seances.length === 0 && !erreur">
      Aucune séance programmée le {{ jourEnLettres(gestion.jour) }}.
    </p>

    <div v-else-if="gestion.seances.length > 0" class="tableau-defilant">
      <table class="tableau">
        <caption>
          {{
            legende
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Horaire</th>
            <th scope="col">Film</th>
            <th scope="col">Salle</th>
            <th scope="col">Version</th>
            <th scope="col">Tarifs</th>
            <th scope="col">État</th>
            <th scope="col">Places vendues</th>
            <th scope="col"><span class="visuellement-cache">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="seance in gestion.seances" :key="seance.id">
            <th scope="row">{{ heureDe(seance.debut) }} – {{ heureDe(seance.fin) }}</th>
            <td>{{ seance.film.titre }}</td>
            <td>{{ seance.salle.nom }}</td>
            <td>{{ seance.langue.toUpperCase() }}</td>
            <td>
              <span v-for="tarif in seance.tarifs" :key="tarif.id" class="tarif">
                {{ tarif.libelle }} {{ prixEnEuros(tarif.prix_centimes) }}
              </span>
            </td>
            <td>
              <span :class="['etat', `etat--${seance.statut}`]">
                {{ seance.statut === 'publiee' ? 'Publiée' : 'Brouillon' }}
              </span>
            </td>
            <td>{{ seance.places_vendues }} / {{ seance.salle.capacite }}</td>
            <td class="tableau__actions">
              <RouterLink
                v-if="seance.places_vendues === 0"
                :to="{ name: 'admin-seance-modifier', params: { id: seance.id } }"
                :aria-label="`Modifier ${intitule(seance)}`"
              >
                Modifier
              </RouterLink>
              <template v-if="seance.statut === 'brouillon'">
                <button
                  type="button"
                  class="bouton-lien"
                  :disabled="actionEnCours"
                  :aria-label="`Publier ${intitule(seance)}`"
                  @click="agir(() => gestion.publier(seance))"
                >
                  Publier
                </button>
                <button
                  type="button"
                  class="bouton-lien"
                  :disabled="actionEnCours"
                  :aria-label="`Supprimer ${intitule(seance)}`"
                  @click="supprimer(seance)"
                >
                  Supprimer
                </button>
              </template>
              <button
                v-else
                type="button"
                class="bouton-lien"
                :disabled="actionEnCours"
                :aria-label="`Dépublier ${intitule(seance)}`"
                @click="depublier(seance)"
              >
                Dépublier
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

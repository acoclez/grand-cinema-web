<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useSessionExpiree } from '@/composables/useSessionExpiree.ts'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api.ts'
import { useGestionFilmsStore } from '@/stores/gestionFilms.ts'
import type { Film } from '@/types/film.ts'

const gestion = useGestionFilmsStore()
const { rediriger } = useSessionExpiree()
const chargement = ref(true)
const actionEnCours = ref(false)
const erreur = ref<string | null>(null)

const formatDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' })

/** Exécute un appel à l'API et affiche son erreur éventuelle. */
async function executer(action: () => Promise<void>) {
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

async function changerDePage(page: number) {
  gestion.page = page
  gestion.annonce = null
  await charger()
}

async function basculerArchives() {
  await changerDePage(1)
}

async function archiver(film: Film) {
  const confirme = window.confirm(
    `Archiver « ${film.titre} » ? Le film ne sera plus visible sur le site public, mais restera dans l'historique.`,
  )
  if (!confirme) {
    return
  }
  actionEnCours.value = true
  await executer(() => gestion.archiver(film))
  actionEnCours.value = false
}

async function restaurer(film: Film) {
  actionEnCours.value = true
  await executer(() => gestion.restaurer(film))
  actionEnCours.value = false
}

onMounted(charger)
// Le message de confirmation ne s'affiche qu'une fois.
onUnmounted(() => {
  gestion.annonce = null
})
</script>

<template>
  <main>
    <div class="titre-page">
      <h1>Films</h1>
      <RouterLink :to="{ name: 'admin-film-nouveau' }" class="bouton">Ajouter un film</RouterLink>
    </div>

    <p v-if="gestion.annonce" class="message message--succes" role="status">
      {{ gestion.annonce }}
    </p>
    <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>

    <div class="case">
      <input
        id="films-archives"
        v-model="gestion.avecArchives"
        type="checkbox"
        @change="basculerArchives"
      />
      <label for="films-archives">Afficher aussi les films archivés</label>
    </div>

    <p v-if="chargement" role="status">Chargement des films…</p>
    <p v-else-if="gestion.films.length === 0 && !erreur">Aucun film pour le moment.</p>

    <div v-else-if="gestion.films.length > 0" class="tableau-defilant">
      <table class="tableau">
        <caption>
          {{
            gestion.total
          }}
          {{
            gestion.total > 1 ? 'films' : 'film'
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Titre</th>
            <th scope="col">Durée</th>
            <th scope="col">Genre</th>
            <th scope="col">Classification</th>
            <th scope="col">État</th>
            <th scope="col"><span class="visuellement-cache">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="film in gestion.films" :key="film.id">
            <th scope="row">{{ film.titre }}</th>
            <td>{{ film.duree_minutes }} min</td>
            <td>{{ film.genre }}</td>
            <td>{{ film.classification }}</td>
            <td>
              <template v-if="film.archive && film.archive_le">
                Archivé le {{ formatDate.format(new Date(film.archive_le)) }}
              </template>
              <template v-else>À l'affiche</template>
            </td>
            <td class="tableau__actions">
              <RouterLink
                :to="{ name: 'admin-film-modifier', params: { id: film.id } }"
                :aria-label="`Modifier ${film.titre}`"
              >
                Modifier
              </RouterLink>
              <button
                v-if="film.archive"
                type="button"
                class="bouton-lien"
                :disabled="actionEnCours"
                :aria-label="`Remettre ${film.titre} à l'affiche`"
                @click="restaurer(film)"
              >
                Remettre à l'affiche
              </button>
              <button
                v-else
                type="button"
                class="bouton-lien"
                :disabled="actionEnCours"
                :aria-label="`Archiver ${film.titre}`"
                @click="archiver(film)"
              >
                Archiver
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="gestion.dernierePage > 1" class="pagination" aria-label="Pages de la liste">
      <button
        type="button"
        class="bouton-lien"
        :disabled="gestion.page <= 1 || chargement"
        @click="changerDePage(gestion.page - 1)"
      >
        Page précédente
      </button>
      <span>Page {{ gestion.page }} sur {{ gestion.dernierePage }}</span>
      <button
        type="button"
        class="bouton-lien"
        :disabled="gestion.page >= gestion.dernierePage || chargement"
        @click="changerDePage(gestion.page + 1)"
      >
        Page suivante
      </button>
    </nav>
  </main>
</template>

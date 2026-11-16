<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { PERSONNEL_DU_GUICHET } from '@/types/compte'

const auth = useAuthStore()
const router = useRouter()

async function seDeconnecter() {
  await auth.deconnecter()
  await router.push({ name: 'accueil' })
}
</script>

<template>
  <header class="entete">
    <RouterLink :to="{ name: 'accueil' }" class="entete__marque">Le Grand Cinéma</RouterLink>
    <nav aria-label="Programmation">
      <RouterLink :to="{ name: 'films' }">Films à l'affiche</RouterLink>
      <RouterLink :to="{ name: 'seances' }">Séances</RouterLink>
    </nav>
    <nav v-if="auth.aUnDesRoles(PERSONNEL_DU_GUICHET)" aria-label="Guichet">
      <RouterLink :to="{ name: 'seances' }">Vendre au guichet</RouterLink>
      <RouterLink :to="{ name: 'recherche-reservations' }">Rechercher une réservation</RouterLink>
    </nav>
    <nav v-if="auth.aUnDesRoles(['administrateur'])" aria-label="Back-office">
      <RouterLink :to="{ name: 'admin-films' }">Films</RouterLink>
      <RouterLink :to="{ name: 'admin-seances' }">Séances</RouterLink>
      <RouterLink :to="{ name: 'admin-salles' }">Salles</RouterLink>
    </nav>
    <nav aria-label="Compte">
      <template v-if="auth.estConnecte">
        <RouterLink v-if="auth.aUnDesRoles(['spectateur'])" :to="{ name: 'mes-billets' }">
          Mes billets
        </RouterLink>
        <RouterLink :to="{ name: 'mon-compte' }">Mon espace</RouterLink>
        <button type="button" class="bouton-lien" @click="seDeconnecter">Se déconnecter</button>
      </template>
      <template v-else>
        <RouterLink :to="{ name: 'connexion' }">Se connecter</RouterLink>
        <RouterLink :to="{ name: 'inscription' }">Créer un compte</RouterLink>
      </template>
    </nav>
  </header>

  <RouterView />
</template>

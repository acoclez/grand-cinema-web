<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ChoixDesTarifs from '@/components/ChoixDesTarifs.vue'
import { useSessionExpiree } from '@/composables/useSessionExpiree'
import { ErreurApi, MESSAGE_ERREUR_INATTENDUE } from '@/services/api'
import { ouvrirPageExterne } from '@/services/navigation'
import { useReservationStore } from '@/stores/reservation'
import { libellePlace, montantDesTarifs, type Reservation } from '@/types/reservation'
import { compteARebours, dateDe, heureDe, jourEnLettres, prixEnEuros } from '@/utils/format'

/**
 * Réservation en cours: les places restent bloquées 10 minutes, le temps de choisir un tarif
 * par place et de payer sur la page de Stripe (US-09). Stripe renvoie ensuite le spectateur
 * ici, avec ?paiement=termine ou ?paiement=abandonne.
 * Le compte à rebours part du temps restant donné par l'API.
 */
const props = defineProps<{ id: number }>()

const store = useReservationStore()
const route = useRoute()
const router = useRouter()
const { rediriger } = useSessionExpiree()

const reservation = ref<Reservation | null>(null)
/** Tarif choisi pour chaque place, par identifiant de place. */
const tarifs = ref<Record<number, number>>({})
const chargement = ref(true)
const envoi = ref(false)
const erreur = ref<string | null>(null)
const secondes = ref(0)
let finDuBlocage = 0
let minuterie: ReturnType<typeof setInterval> | undefined

const retourDePaiement = computed(() => route.query.paiement)
const enAttente = computed(() => reservation.value?.statut === 'en_attente' && secondes.value > 0)
const places = computed(() => {
  const liste = reservation.value?.places ?? []
  const libelles = liste.map(libellePlace).join(', ')
  return liste.length === 1 ? `${libelles} (1 place)` : `${libelles} (${liste.length} places)`
})
const total = computed(() =>
  montantDesTarifs(
    reservation.value?.places.map((place) => place.id) ?? [],
    reservation.value?.seance.tarifs ?? [],
    tarifs.value,
  ),
)
/** Détail d'une réservation payée, par exemple « B1 Plein 9,50 €, B2 Réduit 7,00 € ». */
const detailDesTarifs = computed(() =>
  (reservation.value?.places ?? [])
    .map((place) => `${libellePlace(place)} ${place.tarif} ${prixEnEuros(place.prix_centimes)}`)
    .join(', '),
)
const messageDeFin = computed(() => {
  const fin =
    reservation.value?.statut === 'annulee'
      ? 'Vous avez abandonné cette réservation: ses places sont libérées.'
      : 'Le délai de 10 minutes est dépassé: vos places ont été libérées.'
  return reservation.value?.paiement === 'rembourse'
    ? `${fin} Votre paiement, arrivé après leur libération, vous a été remboursé.`
    : fin
})

function decompter(): void {
  secondes.value = Math.max(0, Math.round((finDuBlocage - Date.now()) / 1000))
  if (secondes.value === 0) {
    clearInterval(minuterie)
  }
}

function demarrerCompteARebours(restantes: number): void {
  clearInterval(minuterie)
  finDuBlocage = Date.now() + restantes * 1000
  decompter()
  if (secondes.value > 0) {
    minuterie = setInterval(decompter, 1000)
  }
}

/** Affiche la réservation: tarifs déjà choisis, sinon le premier tarif de la séance. */
function afficher(chargee: Reservation): void {
  reservation.value = chargee
  const parLibelle = new Map(chargee.seance.tarifs.map((tarif) => [tarif.libelle, tarif.id]))
  const premier = chargee.seance.tarifs[0]?.id ?? 0
  tarifs.value = Object.fromEntries(
    chargee.places.map((place) => [place.id, parLibelle.get(place.tarif ?? '') ?? premier]),
  )
  demarrerCompteARebours(chargee.secondes_restantes)
}

async function agir(action: (enCours: Reservation) => Promise<void>): Promise<void> {
  if (reservation.value === null) {
    return
  }
  envoi.value = true
  erreur.value = null
  try {
    await action(reservation.value)
  } catch (e) {
    if (!(await rediriger(e))) {
      erreur.value = e instanceof ErreurApi ? e.message : MESSAGE_ERREUR_INATTENDUE
    }
  } finally {
    envoi.value = false
  }
}

const payer = () =>
  agir(async (enCours) => {
    ouvrirPageExterne(await store.payer(enCours, tarifs.value))
  })

const verifier = () =>
  agir(async (enCours) => {
    afficher(await store.verifierPaiement(enCours.id))
  })

const abandonner = () =>
  agir(async (enCours) => {
    await store.abandonner(enCours.id)
    reservation.value = { ...enCours, statut: 'annulee', secondes_restantes: 0 }
    demarrerCompteARebours(0)
  })

const modifier = () =>
  agir(async (enCours) => {
    const seance = await store.modifier(enCours)
    await router.push({ name: 'plan-de-salle', params: { id: seance } })
  })

async function charger(): Promise<Reservation> {
  if (retourDePaiement.value === 'termine') {
    // Retour de Stripe après le paiement: l'API vérifie qu'il est accepté.
    return store.verifierPaiement(props.id)
  }
  // Juste après le blocage, la réservation est déjà dans le store.
  return store.reservation?.id === props.id ? store.reservation : store.chargerReservation(props.id)
}

onMounted(async () => {
  try {
    afficher(await charger())
  } catch (e) {
    if (!(await rediriger(e))) {
      erreur.value =
        e instanceof ErreurApi && e.statut === 404
          ? 'Cette réservation est introuvable.'
          : e instanceof ErreurApi
            ? e.message
            : MESSAGE_ERREUR_INATTENDUE
    }
  } finally {
    chargement.value = false
  }
})

onBeforeUnmount(() => clearInterval(minuterie))
</script>

<template>
  <main>
    <h1>Votre réservation</h1>

    <p v-if="chargement" role="status">Chargement de la réservation…</p>
    <template v-else-if="reservation">
      <dl class="profil">
        <dt>Numéro</dt>
        <dd class="reservation__numero">{{ reservation.numero }}</dd>
        <dt>Film</dt>
        <dd>{{ reservation.seance.film.titre }}</dd>
        <dt>Séance</dt>
        <dd>
          {{ jourEnLettres(dateDe(reservation.seance.debut)) }} à
          {{ heureDe(reservation.seance.debut) }}, {{ reservation.seance.salle.nom }},
          {{ reservation.seance.langue.toUpperCase() }}
        </dd>
        <dt>Places</dt>
        <dd class="reservation__places">{{ places }}</dd>
        <template v-if="reservation.statut === 'confirmee'">
          <dt>Tarifs</dt>
          <dd class="reservation__tarifs">{{ detailDesTarifs }}</dd>
          <dt>Montant payé</dt>
          <dd class="reservation__montant">{{ prixEnEuros(reservation.montant_centimes) }}</dd>
        </template>
      </dl>

      <template v-if="enAttente">
        <p class="message message--succes compte-a-rebours">
          Vos places sont bloquées pour vous pendant encore
          <strong>{{ compteARebours(secondes) }}</strong
          >.
        </p>

        <div role="status" aria-live="polite">
          <p v-if="retourDePaiement === 'termine'" class="message message--erreur paiement__retour">
            Votre paiement n’est pas encore accepté par Stripe. Vérifiez-le dans un instant.
            <button type="button" class="bouton-lien" :disabled="envoi" @click="verifier">
              Vérifier mon paiement
            </button>
          </p>
          <p
            v-else-if="retourDePaiement === 'abandonne'"
            class="message message--erreur paiement__retour"
          >
            Paiement non effectué: vos places restent bloquées jusqu’à la fin du délai. Vous pouvez
            payer à nouveau.
          </p>
        </div>

        <section class="panier" aria-labelledby="paiement-titre">
          <h2 id="paiement-titre">Tarifs et paiement</h2>
          <ChoixDesTarifs
            v-model="tarifs"
            :places="reservation.places"
            :tarifs="reservation.seance.tarifs"
            :desactive="envoi"
          />
          <div class="actions">
            <p class="panier__total">Total: {{ prixEnEuros(total) }}</p>
            <button type="button" class="bouton" :disabled="envoi" @click="payer">
              Payer {{ prixEnEuros(total) }}
            </button>
          </div>
          <p class="paiement__securite">
            Vous payez par carte sur la page sécurisée de Stripe: le Grand Cinéma ne voit ni
            n’enregistre vos coordonnées bancaires.
          </p>
        </section>

        <div class="actions">
          <button type="button" class="bouton-lien" :disabled="envoi" @click="modifier">
            Modifier mes places
          </button>
          <button type="button" class="bouton-lien" :disabled="envoi" @click="abandonner">
            Abandonner la réservation
          </button>
        </div>
      </template>
      <p v-else-if="reservation.statut === 'confirmee'" class="message message--succes">
        Votre réservation est confirmée. Vos billets vous sont envoyés par e-mail et vous les
        retrouvez dans <RouterLink :to="{ name: 'mes-billets' }">Mes billets</RouterLink>.
      </p>
      <template v-else>
        <p class="message reservation__fin" role="status">{{ messageDeFin }}</p>
        <RouterLink
          class="bouton"
          :to="{ name: 'plan-de-salle', params: { id: reservation.seance.id } }"
        >
          Choisir de nouvelles places
        </RouterLink>
      </template>
      <p v-if="erreur" class="message message--erreur" role="alert">{{ erreur }}</p>
    </template>
    <p v-else class="message message--erreur" role="alert">{{ erreur }}</p>
  </main>
</template>

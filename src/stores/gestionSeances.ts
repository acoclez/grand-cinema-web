import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/services/api'
import type { Film } from '@/types/film'
import type { Element, ListePaginee } from '@/types/pagination'
import type { ListeSalles, Salle } from '@/types/salle'
import type { DonneesSeance, Seance } from '@/types/seance'
import { dateDe, heureDe, jourIso } from '@/utils/format'

/**
 * Séances et salles du back-office (US-13). Le jour et la salle affichés sont gardés
 * dans le store: après une modification, l'administrateur retrouve son planning.
 */
export const useGestionSeancesStore = defineStore('gestionSeances', () => {
  const seances = ref<Seance[]>([])
  /** Jour affiché, au format AAAA-MM-JJ. */
  const jour = ref(jourIso())
  /** Salle affichée, ou null pour toutes les salles. */
  const salleId = ref<number | null>(null)
  const salles = ref<Salle[]>([])
  const totalPlaces = ref(0)
  /** Message de confirmation à afficher sur la liste après une action. */
  const annonce = ref<string | null>(null)

  async function chargerListe(): Promise<void> {
    const parametres = new URLSearchParams({ date: jour.value })
    if (salleId.value !== null) {
      parametres.set('salle_id', String(salleId.value))
    }
    seances.value = (await api.get<{ data: Seance[] }>(`/admin/seances?${parametres}`)).data
  }

  /** Les salles ne changent pas: elles ne sont chargées qu'une fois. */
  async function chargerSalles(): Promise<Salle[]> {
    if (salles.value.length === 0) {
      const reponse = await api.get<ListeSalles>('/admin/salles')
      salles.value = reponse.data
      totalPlaces.value = reponse.meta.total_places
    }
    return salles.value
  }

  /** Films à l'affiche, pour la liste de choix du formulaire. */
  async function chargerFilms(): Promise<Film[]> {
    return (await api.get<ListePaginee<Film>>('/admin/films?par_page=100')).data
  }

  async function charger(id: number): Promise<Seance> {
    return (await api.get<Element<Seance>>(`/admin/seances/${id}`)).data
  }

  /** Après un enregistrement, la liste s'ouvre sur le jour de la séance. */
  function afficherLeJourDe(seance: Seance, message: string): void {
    jour.value = dateDe(seance.debut)
    annonce.value = message
  }

  async function creer(donnees: DonneesSeance): Promise<Seance> {
    const seance = (await api.post<Element<Seance>>('/admin/seances', donnees)).data
    afficherLeJourDe(
      seance,
      `La séance de « ${seance.film.titre} » à ${heureDe(seance.debut)} est enregistrée en brouillon. Publiez-la pour l'ouvrir aux réservations.`,
    )
    return seance
  }

  async function modifier(id: number, donnees: DonneesSeance): Promise<Seance> {
    const seance = (await api.put<Element<Seance>>(`/admin/seances/${id}`, donnees)).data
    afficherLeJourDe(
      seance,
      `Les modifications de la séance de « ${seance.film.titre} » à ${heureDe(seance.debut)} sont enregistrées.`,
    )
    return seance
  }

  async function publier(seance: Seance): Promise<void> {
    await api.post<Element<Seance>>(`/admin/seances/${seance.id}/publier`)
    annonce.value = `La séance de « ${seance.film.titre} » à ${heureDe(seance.debut)} est publiée sur le site.`
    await chargerListe()
  }

  async function depublier(seance: Seance): Promise<void> {
    await api.post<Element<Seance>>(`/admin/seances/${seance.id}/depublier`)
    annonce.value = `La séance de « ${seance.film.titre} » à ${heureDe(seance.debut)} est repassée en brouillon : elle n'apparaît plus sur le site.`
    await chargerListe()
  }

  async function supprimer(seance: Seance): Promise<void> {
    await api.delete(`/admin/seances/${seance.id}`)
    annonce.value = `La séance de « ${seance.film.titre} » à ${heureDe(seance.debut)} est supprimée.`
    await chargerListe()
  }

  return {
    seances,
    jour,
    salleId,
    salles,
    totalPlaces,
    annonce,
    chargerListe,
    chargerSalles,
    chargerFilms,
    charger,
    creer,
    modifier,
    publier,
    depublier,
    supprimer,
  }
})

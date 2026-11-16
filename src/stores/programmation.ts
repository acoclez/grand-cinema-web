import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api } from '@/services/api'
import type { FilmAlAffiche } from '@/types/film'
import type { Element } from '@/types/pagination'
import type { SeancePublique, SeancesDUnFilm } from '@/types/seance'
import { jourIso } from '@/utils/format'

/**
 * Programmation publique du cinéma: les films à l'affiche et leur fiche (US-01),
 * les séances d'une date et leurs places restantes (US-02).
 */
export const useProgrammationStore = defineStore('programmation', () => {
  const films = ref<FilmAlAffiche[]>([])
  const seances = ref<SeancePublique[]>([])
  /** Date des séances affichées, au format AAAA-MM-JJ, aujourd'hui par défaut. */
  const jour = ref(jourIso())

  /** Séances regroupées par film, les films par ordre alphabétique, les séances par heure. */
  const seancesParFilm = computed<SeancesDUnFilm[]>(() => {
    const groupes = new Map<number, SeancesDUnFilm>()
    for (const seance of seances.value) {
      const groupe = groupes.get(seance.film.id) ?? { film: seance.film, seances: [] }
      groupe.seances.push(seance)
      groupes.set(seance.film.id, groupe)
    }
    return [...groupes.values()].sort((a, b) => a.film.titre.localeCompare(b.film.titre, 'fr'))
  })

  async function chargerFilms(): Promise<void> {
    films.value = (await api.get<{ data: FilmAlAffiche[] }>('/films')).data
  }

  async function chargerFilm(id: number): Promise<FilmAlAffiche> {
    return (await api.get<Element<FilmAlAffiche>>(`/films/${id}`)).data
  }

  async function chargerSeances(): Promise<void> {
    seances.value = (await api.get<{ data: SeancePublique[] }>(`/seances?date=${jour.value}`)).data
  }

  return { films, seances, jour, seancesParFilm, chargerFilms, chargerFilm, chargerSeances }
})

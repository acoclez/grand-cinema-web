import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/services/api'
import type { FilmAlAffiche } from '@/types/film'
import type { Element } from '@/types/pagination'

/**
 * Programmation publique du cinéma (US-01): les films à l'affiche et leur fiche.
 */
export const useProgrammationStore = defineStore('programmation', () => {
  const films = ref<FilmAlAffiche[]>([])

  async function chargerFilms(): Promise<void> {
    films.value = (await api.get<{ data: FilmAlAffiche[] }>('/films')).data
  }

  async function chargerFilm(id: number): Promise<FilmAlAffiche> {
    return (await api.get<Element<FilmAlAffiche>>(`/films/${id}`)).data
  }

  return { films, chargerFilms, chargerFilm }
})

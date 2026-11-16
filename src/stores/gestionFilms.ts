import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/services/api'
import type { DonneesFilm, Film } from '@/types/film'
import type { Element, ListePaginee } from '@/types/pagination'

/**
 * La page et le choix "films archivés" sont gardés dans le store:
 * après une modification, l'administrateur retrouve la liste où il l'a laissée.
 */
export const useGestionFilmsStore = defineStore('gestionFilms', () => {
  const films = ref<Film[]>([])
  const page = ref(1)
  const dernierePage = ref(1)
  const total = ref(0)
  const avecArchives = ref(false)
  /** Message de confirmation à afficher sur la liste après une action. */
  const annonce = ref<string | null>(null)

  async function chargerListe(): Promise<void> {
    const parametres = new URLSearchParams({ page: String(page.value) })
    if (avecArchives.value) {
      parametres.set('archives', '1')
    }
    const reponse = await api.get<ListePaginee<Film>>(`/admin/films?${parametres}`)
    if (reponse.data.length === 0 && page.value > 1) {
      page.value = reponse.meta.last_page
      return chargerListe()
    }
    films.value = reponse.data
    page.value = reponse.meta.current_page
    dernierePage.value = reponse.meta.last_page
    total.value = reponse.meta.total
  }

  async function charger(id: number): Promise<Film> {
    return (await api.get<Element<Film>>(`/admin/films/${id}`)).data
  }

  async function creer(donnees: DonneesFilm): Promise<Film> {
    const film = (await api.post<Element<Film>>('/admin/films', donnees)).data
    annonce.value = `« ${film.titre} » a été ajouté. Il est à l'affiche et peut être programmé.`
    return film
  }

  async function modifier(id: number, donnees: DonneesFilm): Promise<Film> {
    const film = (await api.put<Element<Film>>(`/admin/films/${id}`, donnees)).data
    annonce.value = `Les modifications de « ${film.titre} » sont enregistrées.`
    return film
  }

  async function archiver(film: Film): Promise<void> {
    await api.post<Element<Film>>(`/admin/films/${film.id}/archiver`)
    annonce.value = `« ${film.titre} » est archivé : il n'apparaît plus sur le site public.`
    await chargerListe()
  }

  async function restaurer(film: Film): Promise<void> {
    await api.post<Element<Film>>(`/admin/films/${film.id}/restaurer`)
    annonce.value = `« ${film.titre} » est de nouveau à l'affiche.`
    await chargerListe()
  }

  return {
    films,
    page,
    dernierePage,
    total,
    avecArchives,
    annonce,
    chargerListe,
    charger,
    creer,
    modifier,
    archiver,
    restaurer,
  }
})

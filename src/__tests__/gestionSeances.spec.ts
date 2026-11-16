import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filmDeTest, pageDeFilms, salleDeTest, seanceDeTest } from '@/__tests__/outils'
import { api } from '@/services/api'
import { useGestionSeancesStore } from '@/stores/gestionSeances'
import type { DonneesSeance } from '@/types/seance'

vi.mock('@/services/api', () => import('@/__tests__/apiSimulee'))

const donnees: DonneesSeance = {
  film_id: 1,
  salle_id: 3,
  debut: '2026-11-21T14:00',
  langue: 'vf',
  tarifs: [{ libelle: 'Plein', prix_centimes: 950 }],
}

describe('store de gestion des séances', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('charge les séances du jour, pour toutes les salles ou pour une seule', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [seanceDeTest()] })
    const gestion = useGestionSeancesStore()

    gestion.jour = '2026-11-20'
    await gestion.chargerListe()
    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-11-20')
    expect(gestion.seances).toHaveLength(1)

    gestion.salleId = 3
    await gestion.chargerListe()
    expect(api.get).toHaveBeenLastCalledWith('/admin/seances?date=2026-11-20&salle_id=3')
  })

  it('ne charge les salles qu une fois', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [salleDeTest()], meta: { total_places: 180 } })
    const gestion = useGestionSeancesStore()

    await gestion.chargerSalles()
    await gestion.chargerSalles()

    expect(api.get).toHaveBeenCalledExactlyOnceWith('/admin/salles')
    expect(gestion.totalPlaces).toBe(180)
  })

  it('demande tous les films à l affiche pour la liste de choix', async () => {
    vi.mocked(api.get).mockResolvedValue(pageDeFilms([filmDeTest()]))

    await expect(useGestionSeancesStore().chargerFilms()).resolves.toHaveLength(1)
    expect(api.get).toHaveBeenCalledWith('/admin/films?par_page=100')
  })

  it('après une création ou une modification, la liste s ouvre sur le jour de la séance', async () => {
    const seance = seanceDeTest({ debut: '2026-11-21T14:00:00+01:00', statut: 'brouillon' })
    vi.mocked(api.post).mockResolvedValue({ data: seance })
    vi.mocked(api.put).mockResolvedValue({ data: seance })
    const gestion = useGestionSeancesStore()

    await gestion.creer(donnees)
    expect(api.post).toHaveBeenCalledWith('/admin/seances', donnees)
    expect(gestion.jour).toBe('2026-11-21')
    expect(gestion.annonce).toContain('enregistrée en brouillon')

    await gestion.modifier(1, donnees)
    expect(api.put).toHaveBeenCalledWith('/admin/seances/1', donnees)
    expect(gestion.annonce).toContain('sont enregistrées')
  })

  it('publie, dépublie et supprime une séance, puis recharge la liste', async () => {
    const seance = seanceDeTest({ id: 7 })
    vi.mocked(api.post).mockResolvedValue({ data: seance })
    vi.mocked(api.delete).mockResolvedValue(undefined)
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    const gestion = useGestionSeancesStore()

    await gestion.publier(seance)
    expect(api.post).toHaveBeenCalledWith('/admin/seances/7/publier')
    expect(gestion.annonce).toContain('publiée sur le site')

    await gestion.depublier(seance)
    expect(api.post).toHaveBeenCalledWith('/admin/seances/7/depublier')
    expect(gestion.annonce).toContain('repassée en brouillon')

    await gestion.supprimer(seance)
    expect(api.delete).toHaveBeenCalledWith('/admin/seances/7')
    expect(gestion.annonce).toContain('supprimée')
    expect(api.get).toHaveBeenCalledTimes(3)
  })
})

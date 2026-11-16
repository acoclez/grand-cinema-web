import { api } from '@/services/api'
import type { Element } from '@/types/pagination'
import type { PlaceDuPlan, PlanDeSalle } from '@/types/reservation'

/** Lit le plan de salle d'une séance: le site et le guichet lisent le même. */
export async function lirePlan(seanceId: number): Promise<PlanDeSalle> {
  return (await api.get<Element<PlanDeSalle>>(`/seances/${seanceId}/plan`)).data
}

/**
 * Sépare les places choisies qui viennent d'être prises ailleurs, pour les annoncer,
 * de celles qui restent dans la sélection.
 */
export function separerLesPlacesPrises(
  plan: PlanDeSalle,
  selection: number[],
): { prises: PlaceDuPlan[]; restantes: number[] } {
  const prises = plan.places.filter((place) => !place.libre && selection.includes(place.id))
  return {
    prises,
    restantes: selection.filter((id) => !prises.some((place) => place.id === id)),
  }
}

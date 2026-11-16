import { defineStore } from 'pinia'
import { ref } from 'vue'

import { api } from '@/services/api'
import { lirePlan } from '@/services/planDeSalle'
import type { ControleBillet } from '@/types/controle'
import type { Element } from '@/types/pagination'
import type { PlanDeSalle } from '@/types/reservation'

/**
 * Contrôle des billets à l'entrée d'une séance (US-11): la séance contrôlée et le résultat du
 * dernier QR code scanné.
 */
export const useControleStore = defineStore('controle', () => {
  const seance = ref<PlanDeSalle['seance'] | null>(null)
  const dernier = ref<ControleBillet | null>(null)

  async function chargerSeance(id: number): Promise<void> {
    if (seance.value?.id !== id) {
      seance.value = null
      dernier.value = null
    }
    seance.value = (await lirePlan(id)).seance
  }

  async function controler(seanceId: number, code: string): Promise<ControleBillet> {
    dernier.value = (
      await api.post<Element<ControleBillet>>(`/controle/seances/${seanceId}/billets`, { code })
    ).data
    return dernier.value
  }

  return { seance, dernier, chargerSeance, controler }
})

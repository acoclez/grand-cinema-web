import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api } from '@/services/api'
import { enregistrerFichier } from '@/services/navigation'
import { nomDuFichier, type Billet, type BilletsDUneReservation } from '@/types/billet'

/**
 * Billets électroniques du spectateur (US-10): ceux de ses séances à venir, avec leur QR code,
 * et le billet PDF de chaque place.
 */
export const useBilletsStore = defineStore('billets', () => {
  const billets = ref<Billet[]>([])

  /** Billets regroupés par réservation, dans l'ordre des séances donné par l'API. */
  const parReservation = computed<BilletsDUneReservation[]>(() => {
    const groupes = new Map<number, BilletsDUneReservation>()
    for (const billet of billets.value) {
      const groupe = groupes.get(billet.reservation.id) ?? {
        reservation: billet.reservation,
        seance: billet.seance,
        billets: [],
      }
      groupe.billets.push(billet)
      groupes.set(billet.reservation.id, groupe)
    }
    return [...groupes.values()]
  })

  async function charger(): Promise<void> {
    billets.value = (await api.get<{ data: Billet[] }>('/billets')).data
  }

  async function telecharger(billet: Billet): Promise<void> {
    enregistrerFichier(await api.telecharger(`/billets/${billet.id}/pdf`), nomDuFichier(billet))
  }

  return { billets, parReservation, charger, telecharger }
})

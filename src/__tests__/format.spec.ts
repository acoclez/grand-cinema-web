import { describe, expect, it } from 'vitest'

import {
  centimesDe,
  dateDe,
  decalerJour,
  dureeLisible,
  heureDe,
  jourEnLettres,
  jourIso,
  prixEnEuros,
  saisieDePrix,
} from '@/utils/format'

describe('mise en forme des dates et des prix', () => {
  it('écrit un jour au format AAAA-MM-JJ et le décale, y compris d un mois sur l autre', () => {
    expect(jourIso(new Date(2026, 10, 5))).toBe('2026-11-05')
    expect(decalerJour('2026-11-30', 1)).toBe('2026-12-01')
    expect(decalerJour('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('lit la date et l heure de Paris dans un horaire de l API', () => {
    expect(dateDe('2026-11-20T20:30:00+01:00')).toBe('2026-11-20')
    expect(heureDe('2026-11-20T20:30:00+01:00')).toBe('20:30')
  })

  it('écrit un jour en toutes lettres', () => {
    expect(jourEnLettres('2026-11-20')).toBe('vendredi 20 novembre 2026')
  })

  it('affiche un prix en euros et le prépare pour la saisie', () => {
    expect(prixEnEuros(950)).toMatch(/^9,50\s€$/)
    expect(saisieDePrix(700)).toBe('7,00')
  })

  it('convertit un prix saisi en centimes', () => {
    expect(centimesDe('9,50')).toBe(950)
    expect(centimesDe(' 5.5 ')).toBe(550)
    expect(centimesDe('7')).toBe(700)
    expect(centimesDe('0')).toBe(0)
    expect(centimesDe('')).toBeNull()
    expect(centimesDe('neuf')).toBeNull()
  })

  it('écrit la durée d un film en heures et minutes', () => {
    expect(dureeLisible(112)).toBe('1 h 52')
    expect(dureeLisible(125)).toBe('2 h 05')
    expect(dureeLisible(120)).toBe('2 h')
    expect(dureeLisible(45)).toBe('45 min')
  })
})

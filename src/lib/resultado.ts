import type { PartidoVista } from './types'

export type SetInput = [string, string]

/** Mismas reglas que public.set_valido en la base */
export function setValido(a: number, b: number, superTiebreak: boolean): boolean {
  if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0 || a === b) return false
  const mx = Math.max(a, b)
  const mn = Math.min(a, b)
  if (superTiebreak) return (mx === 11 && mn <= 9) || (mx > 11 && mx - mn === 2)
  return (mx === 6 && mn <= 4) || (mx === 7 && (mn === 5 || mn === 6))
}

/** Mismas reglas que public.set_unico_valido: gana quien llega a N; el otro queda en 0..N-1 */
export function setUnicoValido(a: number, b: number, games: number): boolean {
  if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) return false
  return Math.max(a, b) === games && Math.min(a, b) < games
}

export interface ResultadoValidado {
  ok: boolean
  error?: string
  sets?: (number | null)[]
  ganador?: 'A' | 'B'
}

export function validarResultado(sets: SetInput[], superTiebreak3: boolean, gamesSetUnico: number | null = null): ResultadoValidado {
  const n = sets.map(([a, b]) => [a === '' ? NaN : Number(a), b === '' ? NaN : Number(b)] as [number, number])
  if (gamesSetUnico !== null) {
    if (!setUnicoValido(n[0][0], n[0][1], gamesSetUnico))
      return { ok: false, error: `Se juega a un set de ${gamesSetUnico} games: el ganador llega a ${gamesSetUnico} (ej. ${gamesSetUnico}-${gamesSetUnico - 3})` }
    return { ok: true, sets: [n[0][0], n[0][1], null, null, null, null], ganador: n[0][0] > n[0][1] ? 'A' : 'B' }
  }
  for (let i = 0; i < 2; i++) {
    if (!setValido(n[i][0], n[i][1], false))
      return { ok: false, error: `Set ${i + 1}: los sets terminan 6-0 a 6-4, 7-5 o 7-6` }
  }
  let a = (n[0][0] > n[0][1] ? 1 : 0) + (n[1][0] > n[1][1] ? 1 : 0)
  const huboTercero = a === 1
  const tercerCargado = sets[2][0] !== '' || sets[2][1] !== ''
  if (huboTercero) {
    if (!setValido(n[2][0], n[2][1], superTiebreak3))
      return {
        ok: false,
        error: superTiebreak3
          ? 'El 3er set es super tiebreak a 11 con 2 de diferencia (ej. 11-7, 12-10)'
          : 'Set 3: los sets terminan 6-0 a 6-4, 7-5 o 7-6',
      }
    a += n[2][0] > n[2][1] ? 1 : 0
  } else if (tercerCargado) {
    return { ok: false, error: 'El partido se definió en 2 sets: dejá vacío el 3er set' }
  }
  const sets2: (number | null)[] = [
    n[0][0], n[0][1], n[1][0], n[1][1],
    huboTercero ? n[2][0] : null, huboTercero ? n[2][1] : null,
  ]
  return {
    ok: true,
    sets: sets2,
    ganador: a >= 2 ? 'A' : 'B',
  }
}

export function setsDe(p: PartidoVista): [number | null, number | null][] {
  return [
    [p.s1_a, p.s1_b],
    [p.s2_a, p.s2_b],
    [p.s3_a, p.s3_b],
  ]
}

export function resumenSets(p: PartidoVista): string {
  if (p.estado === 'wo') return 'W.O.'
  if (p.estado === 'bye') return 'Pasa directo'
  if (p.estado !== 'finalizado') return ''
  return setsDe(p)
    .filter(([a, b]) => a !== null && b !== null)
    .map(([a, b]) => `${a}-${b}`)
    .join(' / ')
}

/** Texto corto del formato del partido (sale de su instancia), para badges y ayudas */
export function formatoPartido(p: Pick<PartidoVista, 'super_tiebreak' | 'games_set_unico'>): string {
  if (p.games_set_unico !== null) return `Americano a ${p.games_set_unico} games`
  return p.super_tiebreak ? 'Mejor de 3 · 3ro super tiebreak' : 'Mejor de 3 sets'
}
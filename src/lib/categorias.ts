import type { Categoria } from './types'

/**
 * Espejo en el cliente de la regla que valida la base (pareja_puede_jugar).
 * - Un caballero nunca juega categorías de damas.
 * - En categorías de caballeros una dama cuenta 2 categorías más (dama 5ta = caballero 7ma).
 * - Nivel: la pareja juega en la categoría de su mejor jugador o superiores.
 * - Suma: la suma de categorías de la pareja tiene que ser >= la de la categoría.
 *   En mixto tiene que ser una dama y un caballero, y se suman los números tal cual.
 */
export function nivelEfectivo(jugador: Categoria, torneo: Categoria): number | null {
  if (jugador.nivel === null) return null
  if (torneo.genero === 'damas' && jugador.genero === 'caballeros') return null
  if (torneo.genero === 'caballeros' && jugador.genero === 'damas') return jugador.nivel + 2
  return jugador.nivel
}

export function parejaPuedeJugar(j1: Categoria, j2: Categoria, torneo: Categoria): boolean {
  const a = nivelEfectivo(j1, torneo)
  const b = nivelEfectivo(j2, torneo)
  if (a === null || b === null) return false
  if (torneo.tipo === 'nivel') return torneo.nivel !== null && torneo.nivel <= Math.min(a, b)
  if (torneo.genero === 'mixto' && j1.genero === j2.genero) return false
  return torneo.suma !== null && a + b >= torneo.suma
}

export function categoriasHabilitadas(j1: Categoria, j2: Categoria, todas: Categoria[]): Categoria[] {
  return todas.filter((c) => c.activa && parejaPuedeJugar(j1, j2, c))
}

/** Suma de la pareja según el género de la categoría (null si no puede jugar ese género) */
export function sumaPareja(j1: Categoria, j2: Categoria, genero: Categoria['genero']): number | null {
  const ref = { genero, tipo: 'suma' } as Categoria
  const a = nivelEfectivo(j1, ref)
  const b = nivelEfectivo(j2, ref)
  if (a === null || b === null) return null
  if (genero === 'mixto' && j1.genero === j2.genero) return null
  return a + b
}

export const categoriasDeNivel = (todas: Categoria[]) => todas.filter((c) => c.tipo === 'nivel')

export const GENERO_LABEL: Record<Categoria['genero'], string> = {
  caballeros: 'Caballeros',
  damas: 'Damas',
  mixto: 'Mixto',
}

import type { Fase } from './types'

/** Formato de partido de una instancia del torneo */
export type FormatoPartido = '3sets' | 'stb' | 'am7' | 'am9'
export type Formatos = Record<Fase, FormatoPartido>

export const FORMATO_LABEL: Record<FormatoPartido, string> = {
  '3sets': 'Al mejor de 3 sets',
  stb: 'Al mejor de 3, el 3ro super tiebreak a 11',
  am7: 'Americano: un set a 7 games',
  am9: 'Americano: un set a 9 games',
}

/** Versión corta, para badges y resúmenes */
export const FORMATO_CORTO: Record<FormatoPartido, string> = {
  '3sets': 'Mejor de 3 sets',
  stb: 'Mejor de 3 · 3ro super tiebreak',
  am7: 'Americano a 7 games',
  am9: 'Americano a 9 games',
}

/** Instancias en orden de juego */
export const INSTANCIAS: { fase: Fase; label: string }[] = [
  { fase: 'zona', label: 'Zonas' },
  { fase: 'dieciseisavos', label: '16avos' },
  { fase: 'octavos', label: 'Octavos' },
  { fase: 'cuartos', label: 'Cuartos' },
  { fase: 'semifinal', label: 'Semifinal' },
  { fase: 'final', label: 'Final' },
]

/** Estándar de NODO: lo que trae un torneo nuevo (igual que el default de la base) */
export const FORMATOS_DEFAULT: Formatos = {
  zona: 'am9', dieciseisavos: 'am9', octavos: 'am9', cuartos: 'am9', semifinal: 'stb', final: 'stb',
}

/** "Zonas a cuartos: Americano a 9 games · Semifinal y final: Mejor de 3 · 3ro super tiebreak" */
export function resumenFormatos(f: Formatos | null | undefined): string {
  if (!f) return ''
  const grupos: { desde: string; hasta: string; n: number; fmt: FormatoPartido }[] = []
  for (const { fase, label } of INSTANCIAS) {
    const ult = grupos[grupos.length - 1]
    if (ult && ult.fmt === f[fase]) { ult.hasta = label; ult.n++ }
    else grupos.push({ desde: label, hasta: label, n: 1, fmt: f[fase] })
  }
  if (grupos.length === 1) return `Todo el torneo: ${FORMATO_CORTO[grupos[0].fmt]}`
  return grupos
    .map((g) => {
      const rango = g.n === 1 ? g.desde : g.n === 2 ? `${g.desde} y ${g.hasta.toLowerCase()}` : `${g.desde} a ${g.hasta.toLowerCase()}`
      return `${rango}: ${FORMATO_CORTO[g.fmt]}`
    })
    .join(' · ')
}
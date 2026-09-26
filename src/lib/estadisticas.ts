export type Instancia =
  | 'campeon' | 'subcampeon' | 'final' | 'semifinal' | 'cuartos' | 'octavos' | 'dieciseisavos' | 'zona'

/** Fila de public.participaciones(): un jugador en una inscripción (categoría de un torneo) */
export interface Participacion {
  jugador_id: string
  dni: string
  nombre: string
  apellido: string
  companero: string
  pareja_id: string
  inscripcion_id: string
  torneo_id: string
  torneo: string
  fecha_desde: string
  americano: boolean
  categoria_id: number
  categoria: string
  categoria_orden: number
  instancia: Instancia
  instancia_orden: number
  /** la categoría todavía no terminó: la instancia es la actual, no la final */
  en_curso: boolean
}

/** Instancias en orden de mérito ('final' = final por jugarse, solo en curso) */
export const INSTANCIAS: { id: Instancia; label: string; corto: string }[] = [
  { id: 'campeon', label: 'Campeón', corto: 'Campeón' },
  { id: 'subcampeon', label: 'Subcampeón', corto: 'Subcamp.' },
  { id: 'final', label: 'Final', corto: 'Final' },
  { id: 'semifinal', label: 'Semifinal', corto: 'Semis' },
  { id: 'cuartos', label: 'Cuartos', corto: 'Cuartos' },
  { id: 'octavos', label: 'Octavos', corto: 'Octavos' },
  { id: 'dieciseisavos', label: '16avos', corto: '16avos' },
  { id: 'zona', label: 'Zona', corto: 'Zona' },
]
export const INSTANCIA_LABEL = Object.fromEntries(INSTANCIAS.map((i) => [i.id, i.label])) as Record<Instancia, string>

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export interface Filtro {
  anio: string
  mes: string
  cat: string
}
export const FILTRO_VACIO: Filtro = { anio: '', mes: '', cat: '' }

export function filtrar(lista: Participacion[], f: Filtro): Participacion[] {
  return lista.filter((p) =>
    (!f.anio || p.fecha_desde.slice(0, 4) === f.anio) &&
    (!f.mes || Number(p.fecha_desde.slice(5, 7)) === Number(f.mes)) &&
    (!f.cat || String(p.categoria_id) === f.cat))
}

export function opcionesFiltro(lista: Participacion[]) {
  const anios = [...new Set(lista.map((p) => p.fecha_desde.slice(0, 4)))].sort().reverse()
  const cats = [...new Map(lista.map((p) => [p.categoria_id, { id: p.categoria_id, nombre: p.categoria, orden: p.categoria_orden }])).values()]
    .sort((a, b) => a.orden - b.orden)
  return { anios, cats }
}

/** Conteo por instancia, en orden de mérito (solo las que tienen al menos una) */
export function resumenInstancias(lista: Participacion[]) {
  return INSTANCIAS.map((i) => ({ ...i, n: lista.filter((p) => p.instancia === i.id).length })).filter((i) => i.n > 0)
}

/** "Campeón (1) · Zona (2)" */
export const textoResumen = (lista: Participacion[]) => resumenInstancias(lista).map((i) => `${i.label} (${i.n})`).join(' · ')

export function mejorInstancia(lista: Participacion[]): Participacion | null {
  return lista.reduce<Participacion | null>((m, p) => (!m || p.instancia_orden < m.instancia_orden ? p : m), null)
}

export const etiquetaInstancia = (p: Participacion) => `${INSTANCIA_LABEL[p.instancia]}${p.en_curso ? ' (en curso)' : ''}`

export const torneosDistintos = (lista: Participacion[]) => new Set(lista.map((p) => p.torneo_id)).size

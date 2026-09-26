import type { EstadoCategoria, EstadoTorneo, Fase } from './types'

const TZ = 'America/Argentina/Buenos_Aires'

export function fecha(d: string | null | undefined): string {
  if (!d) return '—'
  // Las columnas date llegan como 'YYYY-MM-DD': se muestran sin corrimiento de zona horaria
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }
  return new Date(d).toLocaleDateString('es-AR', { timeZone: TZ })
}

export function fechaHora(d: string | null | undefined): string {
  if (!d) return 'A programar'
  return new Date(d).toLocaleString('es-AR', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function rangoFechas(desde: string, hasta: string): string {
  return desde === hasta ? fecha(desde) : `${fecha(desde)} al ${fecha(hasta)}`
}

/** ISO → valor para <input type="datetime-local"> en hora local del navegador */
export function aInputLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function desdeInputLocal(v: string): string | null {
  return v ? new Date(v).toISOString() : null
}

export function faltaPara(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Inscripción cerrada'
  const h = Math.floor(ms / 3.6e6)
  if (h < 1) return `Cierra en ${Math.max(1, Math.floor(ms / 6e4))} min`
  if (h < 48) return `Cierra en ${h} h`
  return `Cierra el ${fechaHora(iso)}`
}

export const FASE_LABEL: Record<Fase, string> = {
  zona: 'Zona',
  dieciseisavos: '16avos de final',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: 'Final',
}

export const ESTADO_TORNEO_LABEL: Record<EstadoTorneo, string> = {
  borrador: 'Borrador',
  publicado: 'Inscripción abierta',
  en_curso: 'En juego',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const ESTADO_CATEGORIA_LABEL: Record<EstadoCategoria, string> = {
  inscripcion: 'Inscripción',
  zonas: 'Fase de zonas',
  playoff: 'Playoff',
  finalizada: 'Finalizada',
  suspendida: 'Suspendida',
}

export const ROL_LABEL = { jugador: 'Jugador', editor: 'Editor', administrador: 'Administrador' } as const

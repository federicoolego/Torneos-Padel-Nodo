const TZ = 'America/Argentina/Buenos_Aires'

/** Minutos de tolerancia para presentarse a cada partido (regla de todos los torneos) */
export const TOLERANCIA_MIN = 15

export const REGLAS_TORNEO = [
  `Tolerancia de ${TOLERANCIA_MIN} minutos: un partido programado a las 14:30 se pierde si a las 14:46 la pareja no está en el predio.`,
  'Tiene que estar la pareja completa: con un solo jugador presente el partido se da por perdido.',
  'Al llegar, anunciarse en pareja con el administrador del torneo.',
  'La cancha asignada es orientativa: puede cambiar según cómo vengan los partidos y la disponibilidad.',
]

const hhmm = (d: Date) => d.toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

/** Hora límite para presentarse (inclusive). 14:30 → '14:45' */
export function toleranciaHasta(iso: string | null | undefined): string | null {
  if (!iso) return null
  return hhmm(new Date(new Date(iso).getTime() + TOLERANCIA_MIN * 60000))
}

/** Nombre de la cancha tal como la cargó el admin (Blindex, Cancha 1…) */
export function nombreCancha(c: string | null | undefined): string | null {
  return c?.trim() || null
}

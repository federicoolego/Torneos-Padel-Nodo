/** Utilidades de fecha en hora de Argentina (UTC-3 fijo, sin horario de verano) */
export const TZ = 'America/Argentina/Buenos_Aires'

/** 'YYYY-MM-DD' del instante, en hora argentina */
export const diaDe = (d: string | Date) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })
export const hoy = () => diaDe(new Date())
export const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

/** Inicio del día (00:00 hora argentina) como ISO */
export const inicioDia = (dia: string) => `${dia}T00:00:00-03:00`

const aDate = (dia: string) => new Date(`${dia}T12:00:00Z`)
const aDia = (d: Date) => d.toISOString().slice(0, 10)
export const sumarDias = (dia: string, n: number) => { const d = aDate(dia); d.setUTCDate(d.getUTCDate() + n); return aDia(d) }
export const sumarMeses = (dia: string, n: number) => { const d = aDate(dia); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); return aDia(d) }
/** 0 = lunes … 6 = domingo */
export const diaSemana = (dia: string) => (aDate(dia).getUTCDay() + 6) % 7
export const lunesDe = (dia: string) => sumarDias(dia, -diaSemana(dia))
export const primeroDeMes = (dia: string) => `${dia.slice(0, 7)}-01`

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const nombreMes = (dia: string) => `${MESES[Number(dia.slice(5, 7)) - 1]} ${dia.slice(0, 4)}`
export const diaLargo = (dia: string) => `${DIAS_CORTOS[diaSemana(dia)]} ${Number(dia.slice(8, 10))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`
export const diaCorto = (dia: string) => `${Number(dia.slice(8, 10))}/${Number(dia.slice(5, 7))}`

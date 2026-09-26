import type { ReactNode } from 'react'
import { MESES, opcionesFiltro, etiquetaInstancia, type Filtro, type Participacion } from '../../lib/estadisticas'
import { fecha } from '../../lib/formato'
import { Select } from '../ui'

export function Filtros({ lista, valor, onChange }: { lista: Participacion[]; valor: Filtro; onChange: (f: Filtro) => void }) {
  const { anios, cats } = opcionesFiltro(lista)
  const set = (k: keyof Filtro) => (e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...valor, [k]: e.target.value })
  return (
    <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
      <Select value={valor.anio} onChange={set('anio')} aria-label="Año">
        <option value="">Todos los años</option>
        {anios.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      <Select value={valor.mes} onChange={set('mes')} aria-label="Mes">
        <option value="">Todos los meses</option>
        {MESES.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
      </Select>
      <Select value={valor.cat} onChange={set('cat')} aria-label="Categoría">
        <option value="">Todas las categorías</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </Select>
    </div>
  )
}

export function Kpi({ titulo, valor, detalle }: { titulo: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-noche/10">
      <p className="text-xs font-medium text-noche/55">{titulo}</p>
      <p className="num mt-1 font-display text-3xl font-bold leading-none">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-noche/55">{detalle}</p>}
    </div>
  )
}

const TONO: Record<string, string> = {
  campeon: 'bg-pelota text-noche',
  subcampeon: 'bg-cancha text-white',
  final: 'bg-cancha-suave text-cancha',
  semifinal: 'bg-cancha-suave text-cancha',
}

export function InstanciaBadge({ p }: { p: Participacion }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${TONO[p.instancia] ?? 'bg-noche/5 text-noche/70'}`}>
      {etiquetaInstancia(p)}
    </span>
  )
}

/** Lista torneo por torneo */
export function ListaParticipaciones({ lista, conCompanero = true }: { lista: Participacion[]; conCompanero?: boolean }) {
  const orden = [...lista].sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde) || a.categoria_orden - b.categoria_orden)
  return (
    <ul className="divide-y divide-noche/5">
      {orden.map((p) => (
        <li key={p.inscripcion_id + p.jugador_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{p.torneo} <span className="font-normal text-noche/55">· {p.categoria}</span></p>
            <p className="text-xs text-noche/55">{fecha(p.fecha_desde)}{conCompanero && ` · con ${p.companero}`}{p.americano && ' · Americano'}</p>
          </div>
          <InstanciaBadge p={p} />
        </li>
      ))}
    </ul>
  )
}

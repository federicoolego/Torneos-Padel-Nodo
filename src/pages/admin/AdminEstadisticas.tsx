import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import {
  FILTRO_VACIO, INSTANCIAS, filtrar, torneosDistintos, type Filtro, type Instancia, type Participacion,
} from '../../lib/estadisticas'
import { Alerta, Button, Card, Input, Spinner, Titulo, Vacio } from '../../components/ui'
import { Filtros, Kpi, ListaParticipaciones } from '../../components/estadisticas/Comunes'

interface Kpis { jugadores: number; jugadores_activos: number; parejas: number; parejas_activas: number; torneos: number; torneos_finalizados: number }
type Orden = 'participaciones' | 'logros'

/** Instancias que se muestran como columnas de logros (la final por jugarse no es un logro todavía) */
const COLS = INSTANCIAS.filter((i) => i.id !== 'final')

interface FilaRanking {
  id: string
  dni: string
  nombre: string
  torneos: number
  participaciones: number
  logros: Record<Instancia, number>
  filas: Participacion[]
}

const cmpDni = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true })

export default function AdminEstadisticas() {
  const [todas, setTodas] = useState<Participacion[] | null>(null)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [error, setError] = useState('')
  const [f, setF] = useState<Filtro>(FILTRO_VACIO)
  const [orden, setOrden] = useState<Orden>('participaciones')
  const [busca, setBusca] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [limite, setLimite] = useState(50)

  useEffect(() => {
    Promise.all([supabase.rpc('participaciones'), supabase.rpc('admin_kpis')]).then(([p, k]) => {
      if (p.error || k.error) setError(mensajeError(p.error ?? k.error))
      setTodas((p.data as Participacion[]) ?? [])
      setKpis(((k.data as Kpis[]) ?? [])[0] ?? null)
    })
  }, [])

  const lista = useMemo(() => filtrar(todas ?? [], f), [todas, f])

  const ranking = useMemo(() => {
    const m = new Map<string, FilaRanking>()
    for (const p of lista) {
      let r = m.get(p.jugador_id)
      if (!r) {
        r = { id: p.jugador_id, dni: p.dni, nombre: `${p.apellido}, ${p.nombre}`, torneos: 0, participaciones: 0,
              logros: Object.fromEntries(INSTANCIAS.map((i) => [i.id, 0])) as Record<Instancia, number>, filas: [] }
        m.set(p.jugador_id, r)
      }
      r.filas.push(p)
      r.participaciones++
      if (!p.en_curso) r.logros[p.instancia]++      // los logros cuentan solo categorías terminadas
    }
    const filas = [...m.values()]
    filas.forEach((r) => { r.torneos = torneosDistintos(r.filas) })
    filas.sort((a, b) => {
      if (orden === 'participaciones') return b.torneos - a.torneos || b.participaciones - a.participaciones || cmpDni(a.dni, b.dni)
      for (const c of COLS) {
        const d = b.logros[c.id] - a.logros[c.id]
        if (d) return d
      }
      return cmpDni(a.dni, b.dni)
    })
    return filas
  }, [lista, orden])

  if (error) return <Alerta tipo="error">{error}</Alerta>
  if (!todas) return <Spinner />

  const q = busca.trim().toLowerCase()
  const visibles = q ? ranking.filter((r) => r.nombre.toLowerCase().includes(q) || r.dni.includes(q)) : ranking
  const hayFiltro = !!(f.anio || f.mes || f.cat)
  const cols = COLS.filter((c) => c.id !== 'dieciseisavos' || ranking.some((r) => r.logros.dieciseisavos > 0))
  const puesto = new Map(ranking.map((r, k) => [r.id, k + 1]))

  return (
    <>
      <Titulo bajada="Participaciones y logros de los jugadores. Los filtros usan la fecha de inicio de cada torneo.">Estadísticas</Titulo>
      <div className="space-y-5">
        <Filtros lista={todas} valor={f} onChange={(x) => { setF(x); setLimite(50) }} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi titulo={hayFiltro ? 'Torneos en el período' : 'Torneos jugados'} valor={torneosDistintos(lista)}
               detalle={!hayFiltro && kpis ? `${kpis.torneos_finalizados} finalizados · ${kpis.torneos} publicados` : undefined} />
          <Kpi titulo="Jugadores que jugaron" valor={ranking.length} detalle={kpis ? `${kpis.jugadores} registrados` : undefined} />
          <Kpi titulo="Parejas que jugaron" valor={new Set(lista.map((p) => p.pareja_id)).size} detalle={kpis ? `${kpis.parejas} creadas` : undefined} />
          <Kpi titulo="Inscripciones jugadas" valor={new Set(lista.map((p) => p.inscripcion_id)).size} detalle="parejas × categoría" />
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-vidrio p-1" role="group" aria-label="Ordenar ranking">
              {(['participaciones', 'logros'] as Orden[]).map((o) => (
                <button key={o} onClick={() => setOrden(o)} aria-pressed={orden === o}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${orden === o ? 'bg-white text-noche shadow-sm' : 'text-noche/55'}`}>
                  {o === 'participaciones' ? 'Participaciones' : 'Logros'}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-noche/40" aria-hidden />
              <Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre o DNI" aria-label="Buscar jugador" />
            </div>
          </div>
          <p className="mt-2 text-xs text-noche/55">
            {orden === 'participaciones'
              ? 'Ordenado por torneos jugados (de más a menos) y DNI.'
              : 'Ordenado por títulos, después subcampeonatos, semis, cuartos y así; a igualdad, por DNI.'}
            {' '}Los logros cuentan solo categorías terminadas; las que están en curso suman en torneos. Tocá un jugador para ver el detalle.
          </p>

          {visibles.length === 0 ? <div className="mt-4"><Vacio titulo="Sin jugadores para mostrar" /></div> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-noche/10 text-left text-xs text-noche/55">
                    <th className="w-10 py-2 font-medium">#</th>
                    <th className="py-2 font-medium">Jugador</th>
                    <th className={`py-2 text-right font-medium ${orden === 'participaciones' ? 'text-noche' : ''}`}>Torneos</th>
                    {cols.map((c) => (
                      <th key={c.id} className={`py-2 pl-3 text-right font-medium ${orden === 'logros' ? 'text-noche' : ''}`}>{c.corto}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.slice(0, limite).map((r) => {
                    const abre = abierto === r.id
                    return (
                      <Fragment key={r.id}>
                        <tr onClick={() => setAbierto(abre ? null : r.id)} className={`cursor-pointer border-b border-noche/5 hover:bg-vidrio ${abre ? 'bg-vidrio' : ''}`}>
                          <td className="num py-2 text-noche/50">{puesto.get(r.id)}</td>
                          <td className="py-2">
                            <button className="flex items-center gap-1 text-left font-medium" aria-expanded={abre}>
                              {abre ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
                              <span>{r.nombre}<span className="block text-xs font-normal text-noche/50">DNI {r.dni}</span></span>
                            </button>
                          </td>
                          <td className="num py-2 text-right font-semibold">{r.torneos}</td>
                          {cols.map((c) => (
                            <td key={c.id} className={`num py-2 pl-3 text-right ${r.logros[c.id] ? (c.id === 'campeon' ? 'font-bold' : '') : 'text-noche/25'}`}>
                              {r.logros[c.id]}
                            </td>
                          ))}
                        </tr>
                        {abre && (
                          <tr className="border-b border-noche/10 bg-vidrio/60">
                            <td />
                            <td colSpan={cols.length + 2} className="pb-3 pr-3">
                              <ListaParticipaciones lista={r.filas} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {visibles.length > limite && (
            <div className="mt-3 text-center"><Button variante="secundario" onClick={() => setLimite(limite + 50)}>Ver más ({visibles.length - limite})</Button></div>
          )}
        </Card>
      </div>
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { ROL_LABEL } from '../../lib/formato'
import { inicioDia, sumarDias, TZ } from '../../lib/fechas'
import { Alerta, Input, Select, Spinner, Titulo, Vacio } from '../../components/ui'

interface Log {
  id: number
  created_at: string
  usuario: string
  rol: keyof typeof ROL_LABEL
  tipo: string
  movimiento: string
}

const POR_PAGINA = 25

export const TIPOS: Record<string, string> = {
  torneo: 'Torneos',
  categoria: 'Categorías del torneo',
  inscripcion: 'Inscripciones',
  jugador: 'Jugadores',
  resultado: 'Resultados',
  programacion: 'Programación',
  zonas: 'Zonas y playoff',
  sede: 'Sedes y canchas',
  config: 'Configuración',
}
const TONO_TIPO: Record<string, string> = {
  torneo: 'bg-noche text-white',
  resultado: 'bg-emerald-100 text-emerald-900',
  jugador: 'bg-amber-100 text-amber-900',
  inscripcion: 'bg-cancha-suave text-cancha',
}

const fechaHora24 = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).replace(',', '')

function TipoBadge({ tipo }: { tipo: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${TONO_TIPO[tipo] ?? 'bg-noche/5 text-noche/70'}`}>{TIPOS[tipo] ?? tipo}</span>
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<Log[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [error, setError] = useState('')
  const [usuarios, setUsuarios] = useState<{ usuario_id: string; usuario: string }[]>([])
  const [f, setF] = useState({ desde: '', hasta: '', usuario: '', rol: '', tipo: '', texto: '' })
  const [texto, setTexto] = useState('')   // búsqueda con demora

  useEffect(() => {
    supabase.rpc('auditoria_usuarios').then(({ data }) =>
      setUsuarios(((data as { usuario_id: string; usuario: string }[]) ?? []).sort((a, b) => a.usuario.localeCompare(b.usuario))))
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { setF((x) => ({ ...x, texto })); setPagina(0) }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const cargar = useCallback(async () => {
    setError('')
    let q = supabase.from('auditoria').select('id, created_at, usuario, rol, tipo, movimiento', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1)
    if (f.desde) q = q.gte('created_at', inicioDia(f.desde))
    if (f.hasta) q = q.lt('created_at', inicioDia(sumarDias(f.hasta, 1)))
    if (f.usuario) q = q.eq('usuario_id', f.usuario)
    if (f.rol) q = q.eq('rol', f.rol)
    if (f.tipo) q = q.eq('tipo', f.tipo)
    if (f.texto.trim()) q = q.ilike('movimiento', `%${f.texto.trim()}%`)
    const { data, count, error } = await q
    if (error) setError(mensajeError(error))
    setLogs((data as Log[]) ?? [])
    setTotal(count ?? 0)
  }, [f, pagina])
  useEffect(() => { cargar() }, [cargar])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setPagina(0) }
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const hayFiltros = Object.values(f).some(Boolean) || !!texto

  return (
    <>
      <Titulo bajada="Movimientos de administradores y editores: torneos, categorías, inscripciones, jugadores, resultados, programación, zonas y sedes.">Logs</Titulo>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-medium text-noche/60">Desde<Input type="date" value={f.desde} onChange={set('desde')} className="mt-0.5" /></label>
        <label className="text-xs font-medium text-noche/60">Hasta<Input type="date" value={f.hasta} onChange={set('hasta')} className="mt-0.5" /></label>
        <label className="text-xs font-medium text-noche/60">Usuario
          <Select value={f.usuario} onChange={set('usuario')} className="mt-0.5">
            <option value="">Todos</option>
            {usuarios.map((u) => <option key={u.usuario_id} value={u.usuario_id}>{u.usuario}</option>)}
          </Select>
        </label>
        <label className="text-xs font-medium text-noche/60">Rol
          <Select value={f.rol} onChange={set('rol')} className="mt-0.5">
            <option value="">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="editor">Editor</option>
          </Select>
        </label>
        <label className="text-xs font-medium text-noche/60">Tipo de movimiento
          <Select value={f.tipo} onChange={set('tipo')} className="mt-0.5">
            <option value="">Todos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </label>
        <label className="text-xs font-medium text-noche/60">Movimiento contiene
          <span className="relative mt-0.5 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-noche/40" aria-hidden />
            <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: Primavera, 5ta, Pérez" className="pl-9" />
          </span>
        </label>
      </div>
      <div className="mb-3 flex items-center justify-between text-sm text-noche/60">
        <span>{logs ? (total ? `Mostrando ${pagina * POR_PAGINA + 1}–${Math.min(total, (pagina + 1) * POR_PAGINA)} de ${total}` : 'Sin movimientos') : ''}</span>
        {hayFiltros && (
          <button onClick={() => { setF({ desde: '', hasta: '', usuario: '', rol: '', tipo: '', texto: '' }); setTexto(''); setPagina(0) }} className="font-semibold text-cancha hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}
      {!logs ? <Spinner /> : logs.length === 0 ? <Vacio titulo="No hay movimientos con esos filtros" /> : (
        <>
          {/* escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl bg-white ring-1 ring-noche/10 md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-noche/10 bg-vidrio text-left text-xs text-noche/60">
                  <th className="w-44 px-4 py-2 font-medium">Fecha</th>
                  <th className="w-56 py-2 font-medium">Usuario</th>
                  <th className="w-32 py-2 font-medium">Rol</th>
                  <th className="py-2 pr-4 font-medium">Movimiento</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-noche/5 align-top last:border-0">
                    <td className="num whitespace-nowrap px-4 py-2.5 text-noche/70">{fechaHora24(l.created_at)}</td>
                    <td className="py-2.5 pr-3">{l.usuario}</td>
                    <td className="py-2.5 pr-3">{ROL_LABEL[l.rol]}</td>
                    <td className="py-2.5 pr-4"><TipoBadge tipo={l.tipo} /> <span className="ml-1">{l.movimiento}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* celular: tarjetas */}
          <ul className="space-y-2 md:hidden">
            {logs.map((l) => (
              <li key={l.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-noche/10">
                <div className="flex items-center justify-between gap-2 text-xs text-noche/60">
                  <span className="num">{fechaHora24(l.created_at)}</span>
                  <TipoBadge tipo={l.tipo} />
                </div>
                <p className="mt-1">{l.movimiento}</p>
                <p className="mt-1 text-xs text-noche/55">{l.usuario} · {ROL_LABEL[l.rol]}</p>
              </li>
            ))}
          </ul>

          {paginas > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-1" aria-label="Paginado">
              <button onClick={() => setPagina(pagina - 1)} disabled={pagina === 0} aria-label="Página anterior"
                className="rounded-lg bg-white p-2 ring-1 ring-noche/15 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              {numerosPagina(pagina, paginas).map((n, k) => n === null ? (
                <span key={`e${k}`} className="px-1 text-noche/40">…</span>
              ) : (
                <button key={n} onClick={() => setPagina(n)} aria-current={n === pagina ? 'page' : undefined}
                  className={`num min-w-[2.25rem] rounded-lg px-2 py-1.5 text-sm font-semibold ring-1 ${n === pagina ? 'bg-noche text-white ring-noche' : 'bg-white ring-noche/15'}`}>
                  {n + 1}
                </button>
              ))}
              <button onClick={() => setPagina(pagina + 1)} disabled={pagina >= paginas - 1} aria-label="Página siguiente"
                className="rounded-lg bg-white p-2 ring-1 ring-noche/15 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </nav>
          )}
        </>
      )}
    </>
  )
}

/** 1 … 4 5 [6] 7 8 … 20 (índices base 0; null = puntos suspensivos) */
function numerosPagina(actual: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, k) => k)
  const out: (number | null)[] = [0]
  const ini = Math.max(1, actual - 1), fin = Math.min(total - 2, actual + 1)
  if (ini > 1) out.push(null)
  for (let k = ini; k <= fin; k++) out.push(k)
  if (fin < total - 2) out.push(null)
  out.push(total - 1)
  return out
}

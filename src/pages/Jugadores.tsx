import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alerta, Badge, Button, Input, Select, Spinner, Titulo, Vacio } from '../components/ui'

/** Solo datos públicos: nombre, apellido y categoría (sin DNI, teléfono ni mail) */
interface JugadorPublico { id: string; nombre: string; apellido: string; categoria_id: number; categoria: string }

const POR_PAGINA = 60

export default function Jugadores() {
  const { jugador, categorias } = useAuth()
  const catsNivel = categorias.filter((c) => c.tipo === 'nivel')
  const [cat, setCat] = useState(jugador ? String(jugador.categoria_id) : '')
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState<JugadorPublico[] | null>(null)
  const [total, setTotal] = useState(0)
  const [limite, setLimite] = useState(POR_PAGINA)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setBusca(texto.trim()); setLimite(POR_PAGINA) }, 250)
    return () => clearTimeout(t)
  }, [texto])

  useEffect(() => {
    let vigente = true
    ;(async () => {
      let q = supabase.from('v_jugadores').select('id, nombre, apellido, categoria_id, categoria', { count: 'exact' })
        .eq('activo', true).order('nombre').order('apellido').range(0, limite - 1)
      if (cat) q = q.eq('categoria_id', Number(cat))
      // cada palabra tiene que aparecer en el nombre o en el apellido ("juan pérez" encuentra a Juan Pérez)
      for (const p of busca.split(/\s+/).filter(Boolean)) {
        const t = p.replace(/[%,()]/g, '')
        if (t) q = q.or(`nombre.ilike.%${t}%,apellido.ilike.%${t}%`)
      }
      const { data, count, error } = await q
      if (!vigente) return
      if (error) setError(mensajeError(error))
      setLista((data as JugadorPublico[]) ?? [])
      setTotal(count ?? 0)
    })()
    return () => { vigente = false }
  }, [cat, busca, limite])

  const nombreCat = catsNivel.find((c) => String(c.id) === cat)?.nombre

  return (
    <>
      <Titulo bajada="Consultá en qué categoría está cada jugador.">Jugadores</Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-noche/40" aria-hidden />
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o apellido" className="pl-9" aria-label="Buscar jugador" />
        </div>
        <div className="w-full sm:w-56">
          <Select value={cat} onChange={(e) => { setCat(e.target.value); setLimite(POR_PAGINA) }} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {catsNivel.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </div>
      </div>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}
      {!lista ? <Spinner /> : lista.length === 0 ? (
        <Vacio titulo="No encontramos jugadores">{busca ? 'Probá con otra búsqueda o con otra categoría.' : 'Todavía no hay jugadores en esta categoría.'}</Vacio>
      ) : (
        <>
          <p className="mb-2 text-sm text-noche/60">
            <span className="num font-semibold text-noche">{total}</span> {total === 1 ? 'jugador' : 'jugadores'}{nombreCat ? ` en ${nombreCat}` : ''}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((j) => (
              <li key={j.id} className={`flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ${j.id === jugador?.id ? 'ring-cancha' : 'ring-noche/10'}`}>
                <span className="min-w-0 truncate font-medium">{j.nombre} {j.apellido}{j.id === jugador?.id && <span className="ml-1 text-xs text-cancha">(vos)</span>}</span>
                {!cat && <Badge tono="azul">{j.categoria}</Badge>}
              </li>
            ))}
          </ul>
          {lista.length < total && (
            <div className="mt-4 text-center">
              <Button variante="secundario" onClick={() => setLimite(limite + POR_PAGINA)}>Ver más ({total - lista.length})</Button>
            </div>
          )}
        </>
      )}
    </>
  )
}

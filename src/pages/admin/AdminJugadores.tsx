import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, Search } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Jugador, Rol } from '../../lib/types'
import { ROL_LABEL } from '../../lib/formato'
import { CLUB } from '../../lib/club'
import { Alerta, Button, Input, Modal, Select, Spinner, Titulo, Vacio } from '../../components/ui'

interface NoElegible { inscripcion_id: string; torneo: string; categoria: string; pareja: string; en_zona: boolean }

export default function AdminJugadores() {
  const { categorias, jugador: yo } = useAuth()
  const catsNivel = categorias.filter((c) => c.tipo === 'nivel')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')
  const [lista, setLista] = useState<Jugador[] | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)
  const [afectadas, setAfectadas] = useState<{ j: Jugador; lista: NoElegible[] } | null>(null)
  const [reset, setReset] = useState<{ j: Jugador; pass?: string; error?: string; cargando?: boolean; copiado?: boolean } | null>(null)

  const buscar = useCallback(async () => {
    let query = supabase.from('jugadores').select('*').order('apellido').order('nombre').limit(100)
    const t = q.trim()
    if (t) query = /^\d+$/.test(t) ? query.like('dni', `${t}%`) : query.or(`apellido.ilike.%${t}%,nombre.ilike.%${t}%`)
    if (cat) query = query.eq('categoria_id', Number(cat))
    if (rol) query = query.eq('rol', rol)
    if (estado === 'activo') query = query.eq('activo', true)
    if (estado === 'inactivo') query = query.eq('activo', false)
    if (estado === 'clave') query = query.eq('debe_cambiar_password', true)
    const { data } = await query
    setLista((data as Jugador[]) ?? [])
  }, [q, cat, rol, estado])

  useEffect(() => {
    const h = setTimeout(buscar, 250)
    return () => clearTimeout(h)
  }, [buscar])

  async function actualizar(j: Jugador, cambios: Partial<Jugador>, txt: string) {
    setMsg(null)
    const { error } = await supabase.from('jugadores').update(cambios).eq('id', j.id)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setMsg({ tipo: 'ok', txt })
    buscar()
  }

  /** Recategoriza y avisa si quedaron inscripciones en categorías donde la pareja ya no puede jugar */
  async function recategorizar(j: Jugador, catId: number, nombre: string) {
    await actualizar(j, { categoria_id: catId }, `${j.apellido} ahora es ${nombre}`)
    const { data } = await supabase.rpc('inscripciones_no_elegibles', { p_jugador: j.id })
    const lista = (data as NoElegible[]) ?? []
    if (lista.length) setAfectadas({ j, lista })
  }

  async function cancelarAfectada(i: NoElegible) {
    if (!afectadas) return
    const { error } = await supabase.from('inscripciones').update({ estado: 'cancelada' }).eq('id', i.inscripcion_id)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    const resto = afectadas.lista.filter((x) => x.inscripcion_id !== i.inscripcion_id)
    setAfectadas(resto.length ? { ...afectadas, lista: resto } : null)
    setMsg({ tipo: 'ok', txt: `Inscripción cancelada: ${i.torneo} · ${i.categoria}${i.en_zona ? '. Rearmá esa zona desde la categoría del torneo.' : ''}` })
  }

  async function resetear() {
    if (!reset) return
    setReset({ ...reset, cargando: true, error: undefined })
    const { data, error } = await supabase.rpc('admin_resetear_password', { p_jugador: reset.j.id })
    if (error) return setReset({ ...reset, cargando: false, error: mensajeError(error) })
    setReset({ ...reset, cargando: false, pass: data as string })
    buscar()
  }

  const mensajeReset = (j: Jugador, pass: string) =>
    `Hola ${j.nombre}, te reseteé la contraseña de Torneos de Pádel ${CLUB.nombre}.\n` +
    `Entrá con tu DNI (${j.dni}) y la clave temporal: ${pass}\n` +
    `Al ingresar te va a pedir que elijas una nueva.`

  async function copiar() {
    if (!reset?.pass) return
    try {
      await navigator.clipboard.writeText(mensajeReset(reset.j, reset.pass))
      setReset({ ...reset, copiado: true })
    } catch {
      /* sin permiso de portapapeles: la clave queda visible para copiarla a mano */
    }
  }

  return (
    <>
      <Titulo bajada="Recategorizá jugadores (ascensos o ajustes) y asigná roles. Cada cambio de categoría queda en el historial del jugador.">Jugadores</Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-noche/40" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por apellido, nombre o DNI" className="pl-9" aria-label="Buscar jugador" />
        </div>
        <div className="w-full sm:w-48">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filtrar por categoría">
            <option value="">Todas las categorías</option>
            {catsNivel.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <Select value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            {(Object.keys(ROL_LABEL) as (keyof typeof ROL_LABEL)[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
          </Select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-48">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="clave">Con clave temporal pendiente</option>
          </Select>
        </div>
        {(cat || rol || estado || q) && (
          <button onClick={() => { setQ(''); setCat(''); setRol(''); setEstado('') }} className="text-sm font-semibold text-cancha hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>
      {msg && <div className="mb-4"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}
      {!lista ? <Spinner /> : lista.length === 0 ? <Vacio titulo="Sin resultados" /> : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-noche/10">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-noche/10 text-left text-xs text-noche/55">
                <th className="px-4 py-2 font-medium">Jugador</th>
                <th className="py-2 font-medium">DNI</th>
                <th className="py-2 font-medium">Teléfono</th>
                <th className="py-2 font-medium">Categoría</th>
                <th className="py-2 font-medium">Rol</th>
                <th className="py-2 font-medium">Activo</th>
                <th className="px-4 py-2 font-medium"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((j) => (
                <tr key={j.id} className={`border-b border-noche/5 last:border-0 ${j.activo ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{j.apellido}, {j.nombre}</p>
                    {j.email && <p className="text-xs text-noche/55">{j.email}</p>}
                  </td>
                  <td className="num">{j.dni}</td>
                  <td><a className="text-cancha" href={`tel:${j.telefono}`}>{j.telefono}</a></td>
                  <td className="pr-3">
                    <Select
                      value={j.categoria_id}
                      aria-label={`Categoría de ${j.apellido}`}
                      onChange={(e) => {
                        const nueva = categorias.find((c) => c.id === Number(e.target.value))!
                        if (confirm(`¿Recategorizar a ${j.nombre} ${j.apellido} en ${nueva.nombre}?`))
                          recategorizar(j, nueva.id, nueva.nombre)
                      }}
                    >
                      {catsNivel.filter((c) => c.activa || c.id === j.categoria_id).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </Select>
                  </td>
                  <td className="pr-3">
                    <Select
                      value={j.rol}
                      aria-label={`Rol de ${j.apellido}`}
                      disabled={j.id === yo?.id}
                      onChange={(e) => actualizar(j, { rol: e.target.value as Rol }, `Rol actualizado: ${ROL_LABEL[e.target.value as Rol]}`)}
                    >
                      {(Object.keys(ROL_LABEL) as Rol[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </Select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={j.activo}
                      disabled={j.id === yo?.id}
                      aria-label={`Activo ${j.apellido}`}
                      onChange={() => actualizar(j, { activo: !j.activo }, j.activo ? 'Jugador desactivado' : 'Jugador activado')}
                    />
                  </td>
                  <td className="px-4 text-right">
                    {j.id !== yo?.id && (
                      <button
                        onClick={() => setReset({ j })}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-cancha hover:underline"
                      >
                        <KeyRound className="h-3.5 w-3.5" aria-hidden /> Resetear contraseña
                      </button>
                    )}
                    {j.debe_cambiar_password && <p className="mt-0.5 text-[11px] text-noche/50">Clave temporal pendiente</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-noche/55">Se muestran hasta 100 jugadores; usá la búsqueda para encontrar el resto.</p>

      <Modal abierto={!!afectadas} titulo="Inscripciones a revisar" onCerrar={() => setAfectadas(null)}>
        {afectadas && (
          <div className="space-y-4">
            <p className="text-sm">
              Con la nueva categoría, <strong>{afectadas.j.nombre} {afectadas.j.apellido}</strong> tiene inscripciones en categorías
              en las que su pareja ya no puede jugar. Podés cancelarlas o dejarlas para que terminen ese torneo donde se anotaron.
            </p>
            <ul className="divide-y divide-noche/10 rounded-lg ring-1 ring-noche/10">
              {afectadas.lista.map((i) => (
                <li key={i.inscripcion_id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <p className="font-medium">{i.torneo} · {i.categoria}</p>
                    <p className="text-xs text-noche/55">{i.pareja}</p>
                    {i.en_zona && <p className="text-xs text-amber-800">Ya está en una zona: si la cancelás, esa zona queda para rearmar.</p>}
                  </div>
                  <Button variante="peligro" onClick={() => cancelarAfectada(i)}>Cancelar inscripción</Button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end"><Button variante="secundario" onClick={() => setAfectadas(null)}>Dejarlas así</Button></div>
          </div>
        )}
      </Modal>

      <Modal abierto={!!reset} titulo="Resetear contraseña" onCerrar={() => setReset(null)}>
        {reset && !reset.pass && (
          <div className="space-y-4">
            <p className="text-sm">
              Se va a generar una clave temporal para <strong>{reset.j.nombre} {reset.j.apellido}</strong> (DNI {reset.j.dni}).
              Se cierran sus sesiones abiertas y, al entrar, la app le pide elegir una nueva.
            </p>
            {reset.error && <Alerta tipo="error">{reset.error}</Alerta>}
            <div className="flex justify-end gap-2">
              <Button variante="fantasma" onClick={() => setReset(null)}>Cancelar</Button>
              <Button onClick={resetear} cargando={reset.cargando}>Generar clave temporal</Button>
            </div>
          </div>
        )}
        {reset?.pass && (
          <div className="space-y-4">
            <p className="text-sm">Clave temporal de <strong>{reset.j.nombre} {reset.j.apellido}</strong>:</p>
            <p className="num select-all rounded-lg bg-vidrio px-4 py-3 text-center font-display text-3xl font-bold tracking-[0.2em]">{reset.pass}</p>
            <Alerta tipo="aviso">Copiala ahora: por seguridad no se vuelve a mostrar. Si la perdés, generá otra.</Alerta>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variante="secundario" onClick={copiar}>
                <Copy className="h-4 w-4" aria-hidden /> {reset.copiado ? 'Mensaje copiado' : 'Copiar mensaje para enviar'}
              </Button>
              <Button onClick={() => setReset(null)}>Listo</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
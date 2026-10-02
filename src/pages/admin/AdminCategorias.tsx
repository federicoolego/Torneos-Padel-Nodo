import { useEffect, useState, type FormEvent } from 'react'
import { supabase, mensajeError } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Categoria, Genero } from '../../lib/types'
import { GENERO_LABEL } from '../../lib/categorias'
import { Alerta, Button, Card, Field, Input, Select, Titulo } from '../../components/ui'

type Tipo = 'nivel' | 'suma'

const GENEROS_SUMA: Genero[] = ['caballeros', 'damas', 'mixto']
const GENEROS_NIVEL: Genero[] = ['caballeros', 'damas']
const NIVELES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const ORDINAL: Record<number, string> = { 1: '1ra', 2: '2da', 3: '3ra', 4: '4ta', 5: '5ta', 6: '6ta', 7: '7ma', 8: '8va', 9: '9na' }

/** Mismo criterio que la migración: caballeros 1..9, damas 11..19, sumas desde 100 */
const ordenNivel = (g: Genero, nivel: number) => (g === 'caballeros' ? nivel : 10 + nivel)
const ordenSuma = (g: Genero, suma: number) => 100 + GENEROS_SUMA.indexOf(g) * 20 + suma

export default function AdminCategorias() {
  const { categorias, recargarCategorias } = useAuth()
  const [tipo, setTipo] = useState<Tipo>('nivel')
  const [genero, setGenero] = useState<Genero>('caballeros')
  const [valor, setValor] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  /** Jugadores por categoría (solo aplica a las de nivel) */
  const [jugadores, setJugadores] = useState<Record<number, number>>({})

  const nivel = categorias.filter((c) => c.tipo === 'nivel')
  const porSuma = categorias.filter((c) => c.tipo === 'suma')

  async function contarJugadores() {
    const { data } = await supabase.from('jugadores').select('categoria_id')
    const n: Record<number, number> = {}
    ;((data as { categoria_id: number }[]) ?? []).forEach((j) => (n[j.categoria_id] = (n[j.categoria_id] ?? 0) + 1))
    setJugadores(n)
  }
  useEffect(() => { contarJugadores() }, [])

  function cambiarTipo(t: Tipo) {
    setTipo(t)
    setValor('')
    if (t === 'nivel' && genero === 'mixto') setGenero('caballeros')
  }

  const nombreNuevo = (() => {
    const n = Number(valor)
    if (!valor) return ''
    return tipo === 'nivel' ? `${ORDINAL[n]} ${GENERO_LABEL[genero]}` : `Suma ${n} ${GENERO_LABEL[genero]}`
  })()

  async function crear(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const n = Number(valor)
    let fila: Partial<Categoria>
    if (tipo === 'nivel') {
      if (!NIVELES.includes(n)) return setMsg({ tipo: 'error', txt: 'Elegí un nivel entre 1ra y 9na' })
      if (nivel.some((c) => c.genero === genero && c.nivel === n)) return setMsg({ tipo: 'error', txt: 'Esa categoría ya existe; si está inactiva, activala' })
      fila = { nombre: nombreNuevo, genero, tipo: 'nivel', nivel: n, orden: ordenNivel(genero, n) }
    } else {
      if (!Number.isInteger(n) || n < 4 || n > 20) return setMsg({ tipo: 'error', txt: 'La suma tiene que ser un número entre 4 y 20' })
      if (porSuma.some((c) => c.genero === genero && c.suma === n)) return setMsg({ tipo: 'error', txt: 'Esa categoría ya existe; si está inactiva, activala' })
      fila = { nombre: nombreNuevo, genero, tipo: 'suma', suma: n, orden: ordenSuma(genero, n) }
    }
    setGuardando(true)
    const { error } = await supabase.from('categorias').insert(fila)
    setGuardando(false)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setValor('')
    setMsg({ tipo: 'ok', txt: `${fila.nombre} creada` })
    recargarCategorias()
  }

  async function alternar(c: Categoria) {
    setMsg(null)
    const n = jugadores[c.id] ?? 0
    if (c.activa && c.tipo === 'nivel' && n > 0 &&
        !confirm(`${c.nombre} tiene ${n} jugador(es). La conservan y se puede seguir asignando a jugadores, pero no va a aparecer al armar torneos. ¿Desactivarla?`)) return
    const { error } = await supabase.from('categorias').update({ activa: !c.activa }).eq('id', c.id)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setMsg({ tipo: 'ok', txt: `${c.nombre} ${c.activa ? 'desactivada' : 'activada'}` })
    recargarCategorias()
  }

  async function eliminar(c: Categoria) {
    setMsg(null)
    const n = jugadores[c.id] ?? 0
    if (n > 0) return setMsg({ tipo: 'error', txt: `No se puede eliminar ${c.nombre}: tiene ${n} jugador(es). Recategorizalos antes desde Admin → Jugadores.` })
    if (!confirm(`¿Eliminar ${c.nombre}? No se puede deshacer.`)) return
    const { error } = await supabase.rpc('admin_eliminar_categoria', { p_categoria: c.id })
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setMsg({ tipo: 'ok', txt: `${c.nombre} eliminada` })
    recargarCategorias()
    contarJugadores()
  }

  function Fila({ c, etiqueta, detalle }: { c: Categoria; etiqueta: string; detalle?: string }) {
    const conJugadores = jugadores[c.id] ?? 0
    return (
      <li className="flex items-center justify-between gap-2 text-sm">
        <span className={c.activa ? 'font-medium' : 'text-noche/40 line-through'}>
          {etiqueta}
          {detalle && <span className="num ml-1.5 text-xs font-normal text-noche/45 no-underline">{detalle}</span>}
        </span>
        <span className="flex shrink-0 gap-3">
          <button onClick={() => alternar(c)} className="text-xs font-semibold text-cancha hover:underline">
            {c.activa ? 'Desactivar' : 'Activar'}
          </button>
          <button
            onClick={() => eliminar(c)}
            disabled={conJugadores > 0}
            title={conJugadores > 0 ? `Tiene ${conJugadores} jugador(es): recategorizalos antes de eliminarla` : undefined}
            className="text-xs font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-noche/30 disabled:no-underline"
          >
            Eliminar
          </button>
        </span>
      </li>
    )
  }

  return (
    <>
      <Titulo bajada="Por categoría: las de los jugadores (3ra, 4ta… 8va). Por suma: se usan en los americanos; la pareja entra si la suma de sus categorías es igual o mayor (en caballeros una dama suma 2 más; en mixto va una dama y un caballero). Las inactivas no aparecen al armar un torneo.">
        Categorías
      </Titulo>
      {msg && <div className="mb-4"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-2xl font-bold">Por categoría</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2">
              {GENEROS_NIVEL.map((g) => (
                <div key={g}>
                  <h3 className="mb-2 text-xs font-semibold text-noche/55">{GENERO_LABEL[g]}</h3>
                  <ul className="space-y-1.5">
                    {nivel.filter((c) => c.genero === g).map((c) => (
                      <Fila key={c.id} c={c} etiqueta={ORDINAL[c.nivel ?? 0] ?? c.nombre} detalle={`${jugadores[c.id] ?? 0} jug.`} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-bold">Por suma</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-3">
              {GENEROS_SUMA.map((g) => (
                <div key={g}>
                  <h3 className="mb-2 text-xs font-semibold text-noche/55">{GENERO_LABEL[g]}</h3>
                  <ul className="space-y-1.5">
                    {porSuma.filter((c) => c.genero === g).map((c) => <Fila key={c.id} c={c} etiqueta={`Suma ${c.suma}`} />)}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-2xl font-bold">Nueva categoría</h2>
            <form onSubmit={crear} className="mt-3 space-y-3">
              <Field label="Tipo">
                <Select value={tipo} onChange={(e) => cambiarTipo(e.target.value as Tipo)}>
                  <option value="nivel">Por categoría (3ra, 4ta… de los jugadores)</option>
                  <option value="suma">Por suma (americanos)</option>
                </Select>
              </Field>
              <Field label="Género">
                <Select value={genero} onChange={(e) => setGenero(e.target.value as Genero)}>
                  {(tipo === 'nivel' ? GENEROS_NIVEL : GENEROS_SUMA).map((g) => <option key={g} value={g}>{GENERO_LABEL[g]}</option>)}
                </Select>
              </Field>
              {tipo === 'nivel' ? (
                <Field label="Categoría" hint={nombreNuevo ? `Se va a llamar "${nombreNuevo}"` : undefined}>
                  <Select value={valor} onChange={(e) => setValor(e.target.value)} required>
                    <option value="" disabled>Elegí</option>
                    {NIVELES.filter((n) => !nivel.some((c) => c.genero === genero && c.nivel === n)).map((n) => (
                      <option key={n} value={n}>{ORDINAL[n]}</option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Suma" hint={nombreNuevo ? `Se va a llamar "${nombreNuevo}"` : undefined}>
                  <Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, '').slice(0, 2))} required />
                </Field>
              )}
              <Button type="submit" cargando={guardando}>Crear</Button>
            </form>
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-bold">Tené en cuenta</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-noche/75">
              <li>Una categoría desactivada no aparece al armar torneos. Las de jugadores se siguen pudiendo elegir al registrarse y al recategorizar (por ejemplo, pasar a alguien de 4ta a 3ra aunque no se armen torneos de 3ra).</li>
              <li>Una categoría con jugadores no se puede eliminar: primero recategorizalos desde Admin → Jugadores (cuentan también los jugadores inactivos).</li>
              <li>Tampoco se puede eliminar si ya se usó en torneos o figura en el historial de algún jugador: en ese caso, desactivala.</li>
              <li>En categorías de caballeros una dama cuenta 2 categorías más (dama 6ta = caballero 8va).</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
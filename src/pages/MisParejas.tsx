import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { ParejaVista } from '../lib/types'
import { categoriasHabilitadas, GENERO_LABEL, sumaPareja } from '../lib/categorias'
import { Alerta, Badge, Button, Card, Field, Input, Modal, Spinner, Titulo, Vacio } from '../components/ui'

interface Encontrado { id: string; nombre: string; apellido: string; categoria_id: number; categoria: string }

export default function MisParejas() {
  const { jugador, categorias } = useAuth()
  const [parejas, setParejas] = useState<ParejaVista[] | null>(null)
  const [nueva, setNueva] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('v_parejas')
      .select('*')
      .or(`jugador1_id.eq.${jugador!.id},jugador2_id.eq.${jugador!.id}`)
      .order('activa', { ascending: false })
      .order('created_at', { ascending: false })
    setParejas((data as ParejaVista[]) ?? [])
  }, [jugador])
  useEffect(() => { cargar() }, [cargar])

  async function alternar(p: ParejaVista) {
    setError('')
    const { error } = await supabase.from('parejas').update({ activa: !p.activa }).eq('id', p.id)
    if (error) return setError(mensajeError(error))
    cargar()
  }

  if (!parejas) return <Spinner />
  const cat = (id: number) => categorias.find((c) => c.id === id)!

  return (
    <>
      <Titulo
        bajada="Para inscribirte a un torneo necesitás una pareja activa. La pareja juega en la categoría de su jugador mejor categorizado o en superiores."
        accion={<Button onClick={() => setNueva(true)}><UserPlus className="h-4 w-4" aria-hidden /> Nueva pareja</Button>}
      >
        Mis Parejas
      </Titulo>
      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}
      {parejas.length === 0 ? (
        <Vacio titulo="Todavía no armaste ninguna pareja" accion={<Button onClick={() => setNueva(true)}>Crear pareja con un DNI</Button>}>
          Tu compañero o compañera tiene que estar registrado en la app.
        </Vacio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parejas.map((p) => {
            const soyUno = p.jugador1_id === jugador!.id
            const companero = soyUno ? p.jugador2 : p.jugador1
            const catCompa = soyUno ? p.categoria2 : p.categoria1
            const habil = categoriasHabilitadas(cat(p.categoria1_id), cat(p.categoria2_id), categorias).filter((c) => c.tipo === 'nivel')
            const sumas = (['caballeros', 'damas', 'mixto'] as const)
              .map((g) => ({ g, s: sumaPareja(cat(p.categoria1_id), cat(p.categoria2_id), g) }))
              .filter((x): x is { g: typeof x.g; s: number } => x.s !== null)
            return (
              <Card key={p.id} className={p.activa ? '' : 'opacity-60'}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-noche/55">Jugás con</p>
                    <p className="font-display text-2xl font-bold">{companero}</p>
                    <p className="text-sm text-noche/70">{catCompa}</p>
                  </div>
                  <Badge tono={p.activa ? 'verde' : 'neutro'}>{p.activa ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-xs text-noche/55">Puede jugar en</p>
                  <div className="flex flex-wrap gap-1.5">
                    {habil.length ? habil.map((c) => <Badge key={c.id} tono="azul">{c.nombre}</Badge>) : <span className="text-sm text-noche/60">Ninguna categoría</span>}
                  </div>
                  {sumas.length > 0 && (
                    <p className="mt-2 text-xs text-noche/60">
                      Americanos por suma: {sumas.map(({ g, s }) => `${GENERO_LABEL[g]} suma ${s}`).join(' · ')}.
                      Juegan en esa suma o menores.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end border-t border-noche/10 pt-3">
                  <Button variante={p.activa ? 'fantasma' : 'secundario'} onClick={() => alternar(p)}>
                    {p.activa ? 'Dar de baja' : 'Reactivar pareja'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {nueva && <NuevaPareja onCerrar={() => setNueva(false)} onListo={() => { setNueva(false); cargar() }} />}
    </>
  )
}

function NuevaPareja({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const { jugador } = useAuth()
  const [dni, setDni] = useState('')
  const [encontrado, setEncontrado] = useState<Encontrado | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function buscar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setEncontrado(null)
    if (dni === jugador?.dni) return setError('Ese es tu DNI. Ingresá el de tu compañero o compañera')
    setCargando(true)
    const { data, error } = await supabase.rpc('buscar_jugador_por_dni', { p_dni: dni })
    setCargando(false)
    if (error) return setError(mensajeError(error))
    const r = (data as Encontrado[])?.[0]
    if (!r) return setError(`No hay ningún jugador registrado con DNI ${dni}. Pedile que se registre en la app primero.`)
    setEncontrado(r)
  }

  async function crear() {
    setCargando(true)
    const { error } = await supabase.rpc('crear_pareja', { p_dni_companero: dni })
    setCargando(false)
    if (error) return setError(mensajeError(error))
    onListo()
  }

  return (
    <Modal abierto titulo="Nueva pareja" onCerrar={onCerrar}>
      <form onSubmit={buscar} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="DNI de tu compañero o compañera">
            <Input inputMode="numeric" autoFocus value={dni} onChange={(e) => { setDni(e.target.value.replace(/\D/g, '')); setEncontrado(null) }} required />
          </Field>
        </div>
        <Button type="submit" variante="secundario" cargando={cargando && !encontrado}>Buscar</Button>
      </form>
      {encontrado && (
        <div className="mt-4 rounded-lg bg-cancha-suave p-4">
          <p className="font-display text-2xl font-bold">{encontrado.nombre} {encontrado.apellido}</p>
          <p className="text-sm text-noche/70">{encontrado.categoria}</p>
        </div>
      )}
      {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variante="secundario" onClick={onCerrar}>Cancelar</Button>
        <Button onClick={crear} disabled={!encontrado} cargando={cargando && !!encontrado}>Crear pareja</Button>
      </div>
    </Modal>
  )
}

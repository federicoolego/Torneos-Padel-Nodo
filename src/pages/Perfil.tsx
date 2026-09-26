import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alerta, Badge, Button, Card, Field, Input, Titulo } from '../components/ui'
import { fecha, ROL_LABEL } from '../lib/formato'

interface Historial { id: number; categoria_anterior_id: number | null; categoria_nueva_id: number; created_at: string }

export default function Perfil() {
  const { jugador, categorias, refrescar } = useAuth()
  const [f, setF] = useState({ nombre: '', apellido: '', telefono: '', email: '' })
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [hist, setHist] = useState<Historial[]>([])
  const [pass, setPass] = useState('')

  useEffect(() => {
    if (!jugador) return
    setF({ nombre: jugador.nombre, apellido: jugador.apellido, telefono: jugador.telefono, email: jugador.email ?? '' })
    supabase
      .from('jugador_categoria_historial')
      .select('*')
      .eq('jugador_id', jugador.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHist((data as Historial[]) ?? []))
  }, [jugador])

  if (!jugador) return null
  const nombreCat = (id: number | null) => categorias.find((c) => c.id === id)?.nombre ?? '—'

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMsg(null)
    const { error } = await supabase
      .from('jugadores')
      .update({ nombre: f.nombre.trim(), apellido: f.apellido.trim(), telefono: f.telefono.trim(), email: f.email.trim() || null })
      .eq('id', jugador!.id)
    setGuardando(false)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    await refrescar()
    setMsg({ tipo: 'ok', txt: 'Datos guardados' })
  }

  async function cambiarPass(e: FormEvent) {
    e.preventDefault()
    if (pass.length < 6) return setMsg({ tipo: 'error', txt: 'La contraseña debe tener al menos 6 caracteres' })
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setPass('')
    setMsg({ tipo: 'ok', txt: 'Contraseña actualizada' })
  }

  return (
    <>
      <Titulo bajada="Tus datos de contacto los ve solo la organización del torneo.">Perfil</Titulo>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
            <Field label="DNI"><Input value={jugador.dni} disabled /></Field>
            <Field label="Rol"><Input value={ROL_LABEL[jugador.rol]} disabled /></Field>
            <Field label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required /></Field>
            <Field label="Apellido"><Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} required /></Field>
            <Field label="Teléfono"><Input type="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} required /></Field>
            <Field label="Email (opcional)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              {msg && <div className="mb-3"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}
              <Button type="submit" cargando={guardando}>Guardar cambios</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-sm text-noche/60">Categoría actual</p>
            <p className="font-display text-3xl font-bold text-cancha">{nombreCat(jugador.categoria_id)}</p>
            <p className="mt-2 text-xs text-noche/60">Solo el administrador puede recategorizarte (ascensos o ajustes).</p>
            {hist.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-noche/10 pt-4 text-sm">
                {hist.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3">
                    <span>
                      {h.categoria_anterior_id ? `${nombreCat(h.categoria_anterior_id)} → ` : 'Alta en '}
                      <strong>{nombreCat(h.categoria_nueva_id)}</strong>
                    </span>
                    <Badge>{fecha(h.created_at)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <form onSubmit={cambiarPass} className="space-y-3">
              <Field label="Nueva contraseña"><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></Field>
              <Button type="submit" variante="secundario">Cambiar contraseña</Button>
            </form>
          </Card>
          {jugador?.rol === 'administrador' && (
            <Card>
              <h2 className="font-display text-xl font-bold">Administración</h2>
              <nav className="mt-2 flex flex-col gap-1 text-sm font-semibold text-cancha" aria-label="Administración">
                <Link to="/calendario" className="py-1">Calendario de partidos</Link>
                <Link to="/admin/torneos" className="py-1">Armado de torneos</Link>
                <Link to="/admin/estadisticas" className="py-1">Estadísticas</Link>
                <Link to="/admin/jugadores" className="py-1">Jugadores</Link>
                <Link to="/admin/categorias" className="py-1">Categorías</Link>
                <Link to="/admin/sedes" className="py-1">Sedes y canchas</Link>
                <Link to="/admin/logs" className="py-1">Logs</Link>
              </nav>
            </Card>
          )}
        </div>
      </div>
      <p className="mt-8 text-center text-[11px] text-noche/40">
        Versión {(import.meta.env.VITE_APP_VERSION ?? 'local').slice(0, 7)} · rol {jugador ? ROL_LABEL[jugador.rol] : '—'}
      </p>
    </>
  )
}

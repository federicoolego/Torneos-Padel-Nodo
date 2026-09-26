import { useState, type FormEvent } from 'react'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alerta, Button, Field, Input } from '../components/ui'
import { PantallaAcceso } from './Login'

/** Se muestra en lugar de la app cuando el admin reseteó la contraseña del jugador. */
export default function CambiarPassword() {
  const { jugador, refrescar, salir } = useAuth()
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (pass !== pass2) return setError('Las contraseñas no coinciden')
    setCargando(true)
    const { error: e1 } = await supabase.auth.updateUser({ password: pass })
    if (e1) {
      setCargando(false)
      return setError(mensajeError(e1))
    }
    const { error: e2 } = await supabase.rpc('marcar_password_cambiada')
    setCargando(false)
    if (e2) return setError(mensajeError(e2))
    await refrescar()
  }

  return (
    <PantallaAcceso>
      <h1 className="font-display text-4xl font-bold">Elegí una nueva contraseña</h1>
      <p className="mt-1 text-sm text-noche/70">
        Hola {jugador?.nombre}, entraste con una clave temporal. Para seguir, elegí la contraseña que vas a usar de ahora en más.
      </p>
      <form onSubmit={guardar} className="mt-8 space-y-4">
        <Field label="Nueva contraseña">
          <Input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        </Field>
        <Field label="Repetila">
          <Input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} required />
        </Field>
        {error && <Alerta tipo="error">{error}</Alerta>}
        <Button type="submit" cargando={cargando} className="w-full">Guardar y entrar</Button>
      </form>
      <button onClick={salir} className="mt-6 text-sm font-semibold text-cancha underline">Cerrar sesión</button>
    </PantallaAcceso>
  )
}

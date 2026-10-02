import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, dniAEmail, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alerta, Button, Field, Input, Select } from '../components/ui'
import { PantallaAcceso } from './Login'

export default function Registro() {
  const nav = useNavigate()
  const { categorias } = useAuth()
  const [f, setF] = useState({ dni: '', nombre: '', apellido: '', telefono: '', categoria_id: '', email: '', pass: '', pass2: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  async function registrar(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\d{6,9}$/.test(f.dni)) return setError('El DNI debe tener entre 6 y 9 números, sin puntos')
    if (f.telefono.replace(/\D/g, '').length < 8) return setError('Ingresá un teléfono válido con código de área')
    if (f.pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (f.pass !== f.pass2) return setError('Las contraseñas no coinciden')

    setCargando(true)
    const { data: libre } = await supabase.rpc('dni_disponible', { p_dni: f.dni })
    if (libre === false) {
      setCargando(false)
      return setError('Ya existe un jugador registrado con ese DNI. Ingresá con tu contraseña')
    }
    const { error } = await supabase.auth.signUp({
      email: dniAEmail(f.dni),
      password: f.pass,
      options: {
        data: {
          dni: f.dni,
          nombre: f.nombre.trim(),
          apellido: f.apellido.trim(),
          telefono: f.telefono.trim(),
          categoria_id: Number(f.categoria_id),
          email: f.email.trim(),
        },
      },
    })
    setCargando(false)
    if (error) return setError(mensajeError(error))
    nav('/torneos')
  }

  return (
    <PantallaAcceso>
      <h1 className="font-display text-4xl font-bold">Registrarme</h1>
      <p className="mt-1 text-sm text-noche/70">Todos los jugadores del torneo tienen que estar registrados.</p>
      <form onSubmit={registrar} className="mt-8 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="DNI" hint="Sin puntos. Es tu usuario para ingresar.">
            <Input inputMode="numeric" value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, '') })} required />
          </Field>
        </div>
        <Field label="Nombre"><Input value={f.nombre} onChange={set('nombre')} required autoComplete="given-name" /></Field>
        <Field label="Apellido"><Input value={f.apellido} onChange={set('apellido')} required autoComplete="family-name" /></Field>
        <div className="col-span-2">
          <Field label="Teléfono"><Input type="tel" value={f.telefono} onChange={set('telefono')} required placeholder="3407 123456" autoComplete="tel" /></Field>
        </div>
        <div className="col-span-2">
          <Field label="Categoría" hint="El administrador puede ajustarla después.">
            <Select value={f.categoria_id} onChange={set('categoria_id')} required>
              <option value="" disabled>Elegí tu categoría</option>
              {categorias.filter((c) => c.tipo === 'nivel').map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Email (opcional)"><Input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        </div>
        <Field label="Contraseña"><Input type="password" value={f.pass} onChange={set('pass')} required autoComplete="new-password" /></Field>
        <Field label="Repetir contraseña"><Input type="password" value={f.pass2} onChange={set('pass2')} required autoComplete="new-password" /></Field>
        {error && <div className="col-span-2"><Alerta tipo="error">{error}</Alerta></div>}
        <Button type="submit" cargando={cargando} className="col-span-2">Crear cuenta</Button>
      </form>
      <p className="mt-6 text-sm text-noche/70">
        ¿Ya tenés cuenta? <Link to="/login" className="font-semibold text-cancha underline-offset-2 hover:underline">Ingresá</Link>
      </p>
    </PantallaAcceso>
  )
}
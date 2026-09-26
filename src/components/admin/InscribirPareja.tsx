import { useEffect, useState, type FormEvent } from 'react'
import { supabase, mensajeError } from '../../lib/supabase'
import { Alerta, Button, Field, Input, Modal, Textarea } from '../ui'

interface JugadorBuscado { id: string; nombre: string; apellido: string; categoria: string }

/** Muestra nombre y categoría del DNI a medida que se escribe */
function DniJugador({ label, valor, onChange }: { label: string; valor: string; onChange: (v: string) => void }) {
  const [j, setJ] = useState<JugadorBuscado | null | undefined>(undefined)
  useEffect(() => {
    const dni = valor.trim()
    if (dni.length < 7) return setJ(undefined)
    let vigente = true
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('buscar_jugador_por_dni', { p_dni: dni })
      if (vigente) setJ(((data as JugadorBuscado[]) ?? [])[0] ?? null)
    }, 300)
    return () => { vigente = false; clearTimeout(t) }
  }, [valor])
  return (
    <Field label={label}>
      <Input inputMode="numeric" value={valor} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))} required />
      <p className={`mt-1 min-h-[1rem] text-xs ${j === null ? 'text-red' : 'text-noche/60'}`}>
        {j === null ? 'No hay un jugador activo con ese DNI' : j ? `${j.nombre} ${j.apellido} · ${j.categoria}` : ''}
      </p>
    </Field>
  )
}

/**
 * Inscripción hecha por el admin: vale aunque haya cerrado la inscripción, hasta que la categoría
 * tenga el primer resultado. Si la pareja no existe, se crea.
 */
export default function InscribirPareja({
  tcId, categoria, conZonas, onCerrar, onHecho,
}: {
  tcId: string
  categoria: string
  conZonas: boolean
  onCerrar: () => void
  onHecho: (txt: string) => void
}) {
  const [dni1, setDni1] = useState('')
  const [dni2, setDni2] = useState('')
  const [horario, setHorario] = useState('')
  const [pagada, setPagada] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    const { error } = await supabase.rpc('admin_inscribir', {
      p_torneo_categoria: tcId, p_dni1: dni1, p_dni2: dni2, p_horario: horario, p_pagada: pagada,
    })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onHecho(conZonas ? 'Pareja inscripta. Quedó sin zona: ubicala en la pestaña Zonas y guardá.' : 'Pareja inscripta')
  }

  return (
    <Modal abierto titulo={`Inscribir pareja · ${categoria}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-sm text-noche/70">
          Como administrador podés inscribir aunque haya cerrado la inscripción, hasta que se cargue el primer resultado.
          Se valida igual que siempre: que puedan jugar esta categoría, el cupo y que ninguno esté anotado con otra pareja.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <DniJugador label="DNI jugador 1" valor={dni1} onChange={setDni1} />
          <DniJugador label="DNI jugador 2" valor={dni2} onChange={setDni2} />
        </div>
        <Field label="Problemas de horario">
          <Textarea value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Si no tienen, dejalo vacío o escribí 'Ninguno'" />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pagada} onChange={(e) => setPagada(e.target.checked)} /> Ya pagó la inscripción</label>
        {conZonas && <Alerta tipo="aviso">Las zonas ya están armadas: la pareja va a quedar “sin zona” hasta que la ubiques.</Alerta>}
        {error && <Alerta tipo="error">{error}</Alerta>}
        <div className="flex justify-end gap-2">
          <Button type="button" variante="secundario" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" cargando={guardando} disabled={dni1.length < 7 || dni2.length < 7}>Inscribir</Button>
        </div>
      </form>
    </Modal>
  )
}

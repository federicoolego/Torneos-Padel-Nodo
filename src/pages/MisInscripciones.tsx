import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, mensajeError } from '../lib/supabase'
import type { MiInscripcion } from '../lib/types'
import { ESTADO_CATEGORIA_LABEL, faltaPara, fechaHora, rangoFechas } from '../lib/formato'
import { Alerta, Badge, Button, Card, Field, Modal, Spinner, Textarea, Titulo, Vacio } from '../components/ui'

export default function MisInscripciones() {
  const [items, setItems] = useState<MiInscripcion[] | null>(null)
  const [verCanceladas, setVerCanceladas] = useState(false)
  const [editando, setEditando] = useState<MiInscripcion | null>(null)
  const [cancelando, setCancelando] = useState<MiInscripcion | null>(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc('mis_inscripciones')
    setItems((data as MiInscripcion[]) ?? [])
  }, [])
  useEffect(() => { cargar() }, [cargar])

  if (!items) return <Spinner />
  const visibles = items.filter((i) => verCanceladas || i.estado === 'activa')

  return (
    <>
      <Titulo
        bajada="Hasta el cierre de inscripción podés cambiar los problemas de horario o cancelar. Después, la inscripción se cobra aunque no se presenten."
        accion={items.some((i) => i.estado === 'cancelada') && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} /> Mostrar canceladas</label>
        )}
      >
        Mis Inscripciones
      </Titulo>

      {visibles.length === 0 ? (
        <Vacio titulo="No tenés inscripciones" accion={<Link to="/torneos" className="font-semibold text-cancha underline">Ver torneos abiertos</Link>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibles.map((i) => (
            <Card key={i.id} className={i.estado === 'cancelada' ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/torneos/${i.torneo_id}?cat=${i.torneo_categoria_id}`} className="font-display text-2xl font-bold hover:text-cancha">{i.torneo}</Link>
                  <p className="text-sm text-noche/70">{i.categoria} · {rangoFechas(i.fecha_desde, i.fecha_hasta)}</p>
                </div>
                {i.estado === 'cancelada' ? <Badge tono="rojo">Cancelada</Badge> : i.puede_editar ? <Badge tono="pelota">Editable</Badge> : <Badge tono="azul">{ESTADO_CATEGORIA_LABEL[i.estado_categoria]}</Badge>}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-noche/55">Compañero/a</dt><dd className="font-medium">{i.companero}</dd></div>
                <div><dt className="text-xs text-noche/55">Cierre de inscripción</dt><dd className="font-medium">{fechaHora(i.cierre_inscripcion)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-noche/55">Problemas de horario</dt><dd className="whitespace-pre-line">{i.problemas_horario || '—'}</dd></div>
              </dl>
              {i.estado === 'activa' && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-noche/10 pt-4">
                  <span className="text-xs text-noche/60">{i.puede_editar ? faltaPara(i.cierre_inscripcion) : 'La inscripción ya cerró: no se puede modificar'}</span>
                  {i.puede_editar && (
                    <div className="flex gap-2">
                      <Button variante="peligro" onClick={() => setCancelando(i)}>Cancelar inscripción</Button>
                      <Button variante="secundario" onClick={() => setEditando(i)}>Editar horarios</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {editando && <EditarHorario ins={editando} onCerrar={() => setEditando(null)} onListo={() => { setEditando(null); cargar() }} />}
      {cancelando && <Cancelar ins={cancelando} onCerrar={() => setCancelando(null)} onListo={() => { setCancelando(null); cargar() }} />}
    </>
  )
}

function EditarHorario({ ins, onCerrar, onListo }: { ins: MiInscripcion; onCerrar: () => void; onListo: () => void }) {
  const [txt, setTxt] = useState(ins.problemas_horario)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    if (!txt.trim()) return setError('Si no tienen problemas de horario, escribí "Ninguno"')
    setGuardando(true)
    const { error } = await supabase.from('inscripciones').update({ problemas_horario: txt.trim() }).eq('id', ins.id)
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onListo()
  }
  return (
    <Modal abierto titulo="Problemas de horario" onCerrar={onCerrar}>
      <Field label={`${ins.torneo} · ${ins.categoria}`}>
        <Textarea rows={4} value={txt} onChange={(e) => setTxt(e.target.value)} />
      </Field>
      {error && <div className="mt-3"><Alerta tipo="error">{error}</Alerta></div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variante="secundario" onClick={onCerrar}>Volver</Button>
        <Button onClick={guardar} cargando={guardando}>Guardar horarios</Button>
      </div>
    </Modal>
  )
}

function Cancelar({ ins, onCerrar, onListo }: { ins: MiInscripcion; onCerrar: () => void; onListo: () => void }) {
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function confirmar() {
    setGuardando(true)
    const { error } = await supabase.from('inscripciones').update({ estado: 'cancelada' }).eq('id', ins.id)
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onListo()
  }
  return (
    <Modal abierto titulo="Cancelar inscripción" onCerrar={onCerrar}>
      <p className="text-sm">Vas a dar de baja a <strong>{ins.pareja}</strong> de <strong>{ins.torneo} · {ins.categoria}</strong>. El lugar queda libre para otra pareja.</p>
      {error && <div className="mt-3"><Alerta tipo="error">{error}</Alerta></div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variante="secundario" onClick={onCerrar}>Volver</Button>
        <Button variante="peligro" onClick={confirmar} cargando={guardando}>Cancelar inscripción</Button>
      </div>
    </Modal>
  )
}

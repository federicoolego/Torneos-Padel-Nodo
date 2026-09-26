import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import type { Cancha, Sede } from '../../lib/types'
import { Alerta, Badge, Button, Card, Field, Input, Spinner, Titulo } from '../../components/ui'

const ordenar = (cs: Cancha[] = []) => [...cs].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))

export default function AdminSedes() {
  const [sedes, setSedes] = useState<Sede[] | null>(null)
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [editando, setEditando] = useState<Sede | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('sedes').select('*, canchas(*)').order('nombre')
    if (error) setError(mensajeError(error))
    setSedes((data as Sede[]) ?? [])
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    const datos = { nombre: nombre.trim(), direccion: direccion.trim() || null }
    const { error } = editando
      ? await supabase.from('sedes').update(datos).eq('id', editando.id)
      : await supabase.from('sedes').insert(datos)
    if (error) return setError(mensajeError(error))
    setNombre(''); setDireccion(''); setEditando(null)
    cargar()
  }

  async function alternar(s: Sede) {
    const { error } = await supabase.from('sedes').update({ activa: !s.activa }).eq('id', s.id)
    if (error) return setError(mensajeError(error))
    cargar()
  }

  if (!sedes) return <Spinner />
  return (
    <>
      <Titulo bajada="Los complejos donde se juegan los partidos y sus canchas. Al programar un partido se elige el complejo y después una de sus canchas activas.">
        Sedes y canchas
      </Titulo>
      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ul className="space-y-4">
          {sedes.map((s) => (
            <li key={s.id} className="rounded-xl bg-white p-4 ring-1 ring-noche/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">{s.nombre}</p>
                  <p className="text-sm text-noche/60">{s.direccion ?? 'Sin dirección'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tono={s.activa ? 'verde' : 'neutro'}>{s.activa ? 'Activa' : 'Inactiva'}</Badge>
                  <Button variante="fantasma" onClick={() => { setEditando(s); setNombre(s.nombre); setDireccion(s.direccion ?? '') }}>Editar</Button>
                  <Button variante="secundario" onClick={() => alternar(s)}>{s.activa ? 'Desactivar' : 'Activar'}</Button>
                </div>
              </div>
              <Canchas sede={s} onCambio={cargar} onError={setError} />
            </li>
          ))}
        </ul>
        <Card>
          <form onSubmit={guardar} className="space-y-4">
            <h2 className="font-display text-2xl font-bold">{editando ? `Editar ${editando.nombre}` : 'Nueva sede'}</h2>
            <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></Field>
            <Field label="Dirección (opcional)"><Input value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>
            <div className="flex gap-2">
              <Button type="submit">{editando ? 'Guardar sede' : 'Agregar sede'}</Button>
              {editando && <Button variante="secundario" type="button" onClick={() => { setEditando(null); setNombre(''); setDireccion('') }}>Cancelar</Button>}
            </div>
            {!editando && <p className="text-xs text-noche/55">Después de crearla, agregale sus canchas.</p>}
          </form>
        </Card>
      </div>
    </>
  )
}

function Canchas({ sede, onCambio, onError }: { sede: Sede; onCambio: () => void; onError: (e: string) => void }) {
  const lista = ordenar(sede.canchas)
  const [nueva, setNueva] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')

  async function ejecutar(q: PromiseLike<{ error: unknown }>) {
    onError('')
    const { error } = await q
    if (error) return onError(mensajeError(error))
    onCambio()
  }

  const agregar = (e: FormEvent) => {
    e.preventDefault()
    if (!nueva.trim()) return
    const orden = (lista[lista.length - 1]?.orden ?? 0) + 1
    ejecutar(supabase.from('canchas').insert({ sede_id: sede.id, nombre: nueva.trim(), orden })).then(() => setNueva(''))
  }
  const renombrar = (c: Cancha) =>
    editNombre.trim() && ejecutar(supabase.from('canchas').update({ nombre: editNombre.trim() }).eq('id', c.id)).then(() => setEditId(null))
  const mover = async (k: number, d: -1 | 1) => {
    const a = lista[k], b = lista[k + d]
    if (!a || !b) return
    // reasigna órdenes consecutivos para que el intercambio sea estable
    const nuevos = lista.map((c, i) => ({ id: c.id, orden: i + 1 }))
    nuevos[k].orden = k + d + 1
    nuevos[k + d].orden = k + 1
    onError('')
    for (const n of nuevos) {
      const { error } = await supabase.from('canchas').update({ orden: n.orden }).eq('id', n.id)
      if (error) return onError(mensajeError(error))
    }
    onCambio()
  }

  return (
    <div className="mt-3 border-t border-noche/10 pt-3">
      <p className="mb-2 text-xs font-semibold text-noche/55">Canchas</p>
      {lista.length === 0 && <p className="mb-2 text-sm text-amber-800">Sin canchas: agregá al menos una para poder programar partidos acá.</p>}
      <ul className="space-y-1.5">
        {lista.map((c, k) => (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <div className="flex flex-col">
              <button onClick={() => mover(k, -1)} disabled={k === 0} aria-label={`Subir ${c.nombre}`} className="text-noche/45 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => mover(k, 1)} disabled={k === lista.length - 1} aria-label={`Bajar ${c.nombre}`} className="text-noche/45 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
            </div>
            {editId === c.id ? (
              <>
                <Input className="max-w-[12rem] py-1" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') renombrar(c); if (e.key === 'Escape') setEditId(null) }} aria-label="Nombre de la cancha" />
                <button onClick={() => renombrar(c)} aria-label="Guardar nombre" className="text-emerald-700"><Check className="h-4 w-4" /></button>
                <button onClick={() => setEditId(null)} aria-label="Cancelar" className="text-noche/50"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className={`font-medium ${c.activa ? '' : 'text-noche/40 line-through'}`}>{c.nombre}</span>
                <button onClick={() => { setEditId(c.id); setEditNombre(c.nombre) }} aria-label={`Renombrar ${c.nombre}`} className="text-noche/45 hover:text-cancha"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => ejecutar(supabase.from('canchas').update({ activa: !c.activa }).eq('id', c.id))} className="ml-auto text-xs font-semibold text-cancha hover:underline">
                  {c.activa ? 'Desactivar' : 'Activar'}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={agregar} className="mt-2 flex gap-2">
        <Input className="max-w-[14rem] py-1.5" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Ej: Blindex, Cancha 3" aria-label={`Nueva cancha en ${sede.nombre}`} />
        <Button type="submit" variante="secundario" disabled={!nueva.trim()}><Plus className="h-4 w-4" aria-hidden /> Agregar</Button>
      </form>
    </div>
  )
}

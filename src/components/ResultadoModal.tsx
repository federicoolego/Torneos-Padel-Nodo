import { useState } from 'react'
import type { PartidoVista } from '../lib/types'
import { supabase, mensajeError } from '../lib/supabase'
import { validarResultado, type SetInput } from '../lib/resultado'
import { Alerta, Button, Input, Modal } from './ui'
import { etiquetaPartido } from './Partidos'

export default function ResultadoModal({
  partido: p,
  esAdmin,
  onCerrar,
  onGuardado,
}: {
  partido: PartidoVista
  esAdmin: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const ini = (v: number | null) => (v === null ? '' : String(v))
  const [modo, setModo] = useState<'sets' | 'wo'>(p.estado === 'wo' ? 'wo' : 'sets')
  const [sets, setSets] = useState<SetInput[]>([
    [ini(p.s1_a), ini(p.s1_b)],
    [ini(p.s2_a), ini(p.s2_b)],
    [ini(p.s3_a), ini(p.s3_b)],
  ])
  const [ganadorWo, setGanadorWo] = useState<string>(p.estado === 'wo' ? p.ganador_id ?? '' : '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambiarSet = (i: number, lado: 0 | 1, v: string) => {
    const n = sets.map((s) => [...s] as SetInput)
    n[i][lado] = v.replace(/\D/g, '').slice(0, 2)
    setSets(n)
  }

  async function guardar() {
    setError('')
    let cambios: Record<string, unknown>
    if (modo === 'wo') {
      if (!ganadorWo) return setError('Elegí qué pareja gana por W.O.')
      cambios = { estado: 'wo', ganador_id: ganadorWo }
    } else {
      const r = validarResultado(sets, p.super_tiebreak, p.games_set_unico)
      if (!r.ok) return setError(r.error!)
      const [s1a, s1b, s2a, s2b, s3a, s3b] = r.sets!
      cambios = { estado: 'finalizado', s1_a: s1a, s1_b: s1b, s2_a: s2a, s2_b: s2b, s3_a: s3a, s3_b: s3b }
    }
    setGuardando(true)
    const { error } = await supabase.from('partidos').update(cambios).eq('id', p.id)
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onGuardado()
  }

  async function anular() {
    if (!confirm('¿Anular el resultado? El partido vuelve a quedar pendiente.')) return
    setGuardando(true)
    const { error } = await supabase.from('partidos').update({ estado: 'pendiente' }).eq('id', p.id)
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onGuardado()
  }

  const setUnico = p.games_set_unico !== null
  const etiquetasSet = setUnico ? ['Games'] : ['1er set', '2do set', p.super_tiebreak ? 'Super tiebreak' : '3er set']

  return (
    <Modal abierto titulo={etiquetaPartido(p)} onCerrar={onCerrar}>
      <div className="mb-4 inline-flex rounded-lg bg-vidrio p-1 text-sm font-semibold">
        {(['sets', 'wo'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-md px-3 py-1.5 ${modo === m ? 'bg-white text-noche shadow-sm' : 'text-noche/60'}`}
          >
            {m === 'sets' ? 'Resultado' : 'Walkover (W.O.)'}
          </button>
        ))}
      </div>

      {modo === 'sets' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-noche/60">
                <th className="pb-2 text-left font-medium">Pareja</th>
                {etiquetasSet.map((e) => <th key={e} className="w-20 pb-2 font-medium">{e}</th>)}
              </tr>
            </thead>
            <tbody>
              {([0, 1] as const).map((lado) => (
                <tr key={lado}>
                  <td className="py-1.5 pr-3 font-medium">{lado === 0 ? p.pareja_a : p.pareja_b}</td>
                  {etiquetasSet.map((_, i) => (
                    <td key={i} className="px-1 py-1.5">
                      <Input
                        inputMode="numeric"
                        aria-label={`${etiquetasSet[i]} ${lado === 0 ? p.pareja_a : p.pareja_b}`}
                        className="text-center font-display text-lg"
                        value={sets[i][lado]}
                        onChange={(e) => cambiarSet(i, lado, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-noche/60">
            {setUnico
              ? `Americano: un solo set a ${p.games_set_unico} games. El ganador llega a ${p.games_set_unico}.`
              : p.super_tiebreak
                ? 'Partido de zona: si hay 1-1 en sets, el tercero es super tiebreak a 11.'
                : 'Playoff: al mejor de 3 sets completos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {[
            { id: p.pareja_a_id!, n: p.pareja_a },
            { id: p.pareja_b_id!, n: p.pareja_b },
          ].map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-3 ring-1 ring-noche/10 has-[:checked]:ring-2 has-[:checked]:ring-cancha">
              <input type="radio" name="wo" checked={ganadorWo === o.id} onChange={() => setGanadorWo(o.id)} />
              <span className="text-sm font-medium">Gana {o.n}</span>
            </label>
          ))}
        </div>
      )}

      {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {esAdmin && p.estado !== 'pendiente' ? (
          <Button variante="peligro" onClick={anular} disabled={guardando}>Anular resultado</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variante="secundario" onClick={onCerrar}>Cancelar</Button>
          <Button onClick={guardar} cargando={guardando}>Guardar resultado</Button>
        </div>
      </div>
    </Modal>
  )
}

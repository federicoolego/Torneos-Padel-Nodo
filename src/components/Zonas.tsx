import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PartidoVista, Posicion, Zona } from '../lib/types'

export function ZonaTabla({
  zona,
  nombres,
  cantidad,
  partidos,
  resaltarIds = [],
}: {
  zona: Zona
  nombres: Record<string, string>
  cantidad: number
  partidos: PartidoVista[]
  resaltarIds?: string[]
}) {
  const [pos, setPos] = useState<Posicion[]>([])
  const clasifican = cantidad === 4 ? 3 : 2
  const huella = partidos.map((p) => p.estado + p.ganador_id).join()

  useEffect(() => {
    supabase.rpc('posiciones_zona', { p_zona: zona.id }).then(({ data }) => setPos((data as Posicion[]) ?? []))
  }, [zona.id, huella])

  const completa = partidos.every((p) => p.estado !== 'pendiente')

  return (
    <section className="overflow-hidden rounded-xl bg-white ring-1 ring-noche/10">
      <header className="flex items-baseline justify-between bg-noche px-4 py-2.5 text-white">
        <h3 className="font-display text-2xl font-bold">Zona {zona.nombre}</h3>
        <span className="text-xs text-white/65">{cantidad} parejas · clasifican {clasifican}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-noche/10 text-xs text-noche/55">
              <th className="w-10 py-2 pl-4 text-left font-medium">#</th>
              <th className="py-2 text-left font-medium">Pareja</th>
              <th className="w-10 py-2 font-medium" title="Partidos jugados">PJ</th>
              <th className="w-10 py-2 font-medium" title="Partidos ganados">PG</th>
              <th className="w-14 py-2 font-medium" title="Sets a favor - en contra">Sets</th>
              <th className="w-16 py-2 pr-4 font-medium" title="Games a favor - en contra">Games</th>
            </tr>
          </thead>
          <tbody className="num">
            {pos.map((r) => {
              const pasa = r.posicion <= clasifican
              return (
                <tr key={r.inscripcion_id} className={`border-b border-noche/5 last:border-0 ${resaltarIds.includes(r.inscripcion_id) ? 'bg-cancha-suave/60' : ''}`}>
                  <td className="py-2.5 pl-4">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-display text-sm font-bold ${pasa && completa ? 'bg-pelota text-noche' : 'text-noche/60'}`}>
                      {r.posicion}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium">{nombres[r.inscripcion_id] ?? '—'}</td>
                  <td className="text-center">{r.pj}</td>
                  <td className="text-center font-semibold">{r.pg}</td>
                  <td className="text-center">{r.sets_favor}-{r.sets_contra}</td>
                  <td className="pr-4 text-center">{r.games_favor}-{r.games_contra}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {cantidad === 4 && (
        <p className="border-t border-noche/10 px-4 py-2 text-xs text-noche/60">
          Zona de 4: 1 vs 4 y 2 vs 3; después ganadores y perdedores. 1° y 2° salen del partido de ganadores, 3° es quien gana el de perdedores.
        </p>
      )}
    </section>
  )
}

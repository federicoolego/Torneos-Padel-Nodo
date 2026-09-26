import { useEffect, useState } from 'react'
import { supabase, mensajeError } from '../../lib/supabase'
import {
  FILTRO_VACIO, filtrar, mejorInstancia, etiquetaInstancia, textoResumen, torneosDistintos,
  type Filtro, type Participacion,
} from '../../lib/estadisticas'
import { Alerta, Card, Spinner, Vacio } from '../ui'
import { Filtros, Kpi, InstanciaBadge, ListaParticipaciones } from './Comunes'

/** Participaciones y rendimiento del jugador logueado */
export default function Rendimiento({ jugadorId }: { jugadorId: string }) {
  const [todas, setTodas] = useState<Participacion[] | null>(null)
  const [error, setError] = useState('')
  const [f, setF] = useState<Filtro>(FILTRO_VACIO)

  useEffect(() => {
    supabase.rpc('participaciones', { p_jugador: jugadorId }).then(({ data, error }) => {
      if (error) setError(mensajeError(error))
      setTodas((data as Participacion[]) ?? [])
    })
  }, [jugadorId])

  if (error) return <Alerta tipo="error">{error}</Alerta>
  if (!todas) return <Spinner />
  if (todas.length === 0) return <Vacio titulo="Todavía no tenés participaciones">Aparecen cuando se arman las zonas de un torneo en el que estés inscripto.</Vacio>

  const lista = filtrar(todas, f)
  const terminadas = lista.filter((p) => !p.en_curso)
  const titulos = terminadas.filter((p) => p.instancia === 'campeon').length
  const finales = terminadas.filter((p) => p.instancia === 'campeon' || p.instancia === 'subcampeon').length
  const mejor = mejorInstancia(terminadas) ?? mejorInstancia(lista)
  const porCat = [...new Map(lista.map((p) => [p.categoria_id, p])).values()]
    .sort((a, b) => a.categoria_orden - b.categoria_orden)
    .map((c) => ({ c, filas: lista.filter((p) => p.categoria_id === c.categoria_id) }))

  return (
    <div className="space-y-5">
      <Filtros lista={todas} valor={f} onChange={setF} />
      {lista.length === 0 ? <Vacio titulo="Sin participaciones con esos filtros" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Torneos jugados" valor={torneosDistintos(lista)} detalle={`${lista.length} participaciones`} />
            <Kpi titulo="Títulos" valor={titulos} />
            <Kpi titulo="Finales jugadas" valor={finales} />
            <Kpi titulo="Mejor instancia" valor={<span className="text-2xl">{mejor ? etiquetaInstancia(mejor) : '—'}</span>} detalle={mejor ? `${mejor.torneo} · ${mejor.categoria}` : undefined} />
          </div>

          <Card>
            <h3 className="font-display text-xl font-semibold">Por categoría</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-noche/10 text-left text-xs text-noche/55">
                    <th className="py-2 pr-3 font-medium">Categoría</th>
                    <th className="py-2 pr-3 font-medium">Torneos</th>
                    <th className="py-2 pr-3 font-medium">Instancias</th>
                    <th className="py-2 font-medium">Mejor</th>
                  </tr>
                </thead>
                <tbody>
                  {porCat.map(({ c, filas }) => {
                    const m = mejorInstancia(filas.filter((p) => !p.en_curso)) ?? mejorInstancia(filas)
                    return (
                      <tr key={c.categoria_id} className="border-b border-noche/5 last:border-0">
                        <td className="py-2 pr-3 font-medium">{c.categoria}</td>
                        <td className="num py-2 pr-3">{filas.length}</td>
                        <td className="py-2 pr-3 text-noche/80">
                          {textoResumen(filas.filter((p) => !p.en_curso)) || '—'}
                          {filas.some((p) => p.en_curso) && <span className="text-noche/50"> · {filas.filter((p) => p.en_curso).length} en curso</span>}
                        </td>
                        <td className="py-2">{m && <InstanciaBadge p={m} />}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-xl font-semibold">Torneo por torneo</h3>
            <ListaParticipaciones lista={lista} />
          </Card>
        </>
      )}
    </div>
  )
}

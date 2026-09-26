import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { MiInscripcion, PartidoVista } from '../lib/types'
import { ESTADO_CATEGORIA_LABEL, rangoFechas } from '../lib/formato'
import { Badge, Spinner, Tabs, Titulo, Vacio } from '../components/ui'
import Rendimiento from '../components/estadisticas/Rendimiento'
import { ReglasTorneo } from '../components/Reglas'
import { PartidoFila } from '../components/Partidos'

export default function MisTorneos() {
  const { jugador, esAdmin, esEditor } = useAuth()
  const [ins, setIns] = useState<MiInscripcion[] | null>(null)
  const [partidos, setPartidos] = useState<PartidoVista[]>([])
  const [n, setN] = useState(0)
  const [tab, setTab] = useState<'partidos' | 'rendimiento'>('partidos')

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.rpc('mis_inscripciones')
      const activas = ((data as MiInscripcion[]) ?? []).filter((i) => i.estado === 'activa')
      setIns(activas)
      if (!activas.length) return
      const ids = activas.map((i) => i.id).join(',')
      const { data: ps } = await supabase
        .from('v_partidos')
        .select('*')
        .or(`pareja_a_id.in.(${ids}),pareja_b_id.in.(${ids})`)
        .neq('estado', 'bye')
        .order('fecha_hora', { ascending: true, nullsFirst: false })
      setPartidos((ps as PartidoVista[]) ?? [])
    })()
  }, [jugador, n])

  if (!ins) return <Spinner />
  const misIds = ins.map((i) => i.id)
  const proximos = partidos.filter((p) => p.estado === 'pendiente')
  const jugados = partidos.filter((p) => p.estado !== 'pendiente').reverse()

  return (
    <>
      <Titulo bajada="Tus próximos partidos, con sede y horario, el historial de resultados y cómo te fue en cada torneo.">Mis Torneos</Titulo>
      <div className="mb-6">
        <Tabs<'partidos' | 'rendimiento'>
          valor={tab}
          onChange={setTab}
          opciones={[{ id: 'partidos', label: 'Partidos' }, { id: 'rendimiento', label: 'Rendimiento' }]}
        />
      </div>
      {tab === 'rendimiento' && jugador ? (
        <Rendimiento jugadorId={jugador.id} />
      ) : ins.length === 0 ? (
        <Vacio titulo="No estás jugando ningún torneo" accion={<Link to="/torneos" className="font-semibold text-cancha underline">Ver torneos</Link>} />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-noche/70">Torneos</h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ins.map((i) => (
                <li key={i.id}>
                  <Link to={`/torneos/${i.torneo_id}?cat=${i.torneo_categoria_id}`} className="block rounded-xl bg-white p-4 ring-1 ring-noche/10 hover:ring-cancha">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-xl font-bold leading-tight">{i.torneo}</p>
                      <Badge tono="azul">{ESTADO_CATEGORIA_LABEL[i.estado_categoria]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-noche/70">{i.categoria} · con {i.companero}</p>
                    <p className="text-xs text-noche/55">{rangoFechas(i.fecha_desde, i.fecha_hasta)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-noche/70">Próximos partidos</h2>
            {proximos.length > 0 && <div className="mb-3"><ReglasTorneo compacto /></div>}
            {proximos.length === 0 ? <p className="text-sm text-noche/60">No tenés partidos pendientes. Aparecen cuando se arman las zonas o avanzás en el cuadro.</p> : (
              <div className="grid gap-3 lg:grid-cols-2">
                {proximos.map((p) => <PartidoFila key={p.id} p={p} puedeCargar={esEditor} esAdmin={esAdmin} onCambio={() => setN(n + 1)} resaltarIds={misIds} mostrarCategoria />)}
              </div>
            )}
          </section>
          {jugados.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold text-noche/70">Resultados</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {jugados.map((p) => <PartidoFila key={p.id} p={p} puedeCargar={false} esAdmin={esAdmin} onCambio={() => setN(n + 1)} resaltarIds={misIds} mostrarCategoria />)}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

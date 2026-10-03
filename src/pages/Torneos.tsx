import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Hourglass } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Torneo, TorneoCategoriaVista } from '../lib/types'
import { ESTADO_TORNEO_LABEL, faltaPara, rangoFechas } from '../lib/formato'
import { resumenFormatos } from '../lib/formatos'
import { Badge, Spinner, Titulo, Vacio } from '../components/ui'

export function inscripcionAbierta(t: Torneo) {
  return t.estado === 'publicado' && new Date(t.cierre_inscripcion).getTime() > Date.now()
}

export function TorneoTarjeta({ t, cats }: { t: Torneo; cats: TorneoCategoriaVista[] }) {
  const abierta = inscripcionAbierta(t)
  return (
    <Link to={`/torneos/${t.id}`} className="group block rounded-xl bg-white p-5 ring-1 ring-noche/10 transition hover:ring-cancha focus-visible:outline focus-visible:outline-2 focus-visible:outline-cancha">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-bold leading-tight group-hover:text-cancha">{t.nombre}</h2>
        <Badge tono={abierta ? 'pelota' : t.estado === 'en_curso' ? 'azul' : 'neutro'}>
          {abierta ? 'Inscripción abierta' : t.estado === 'publicado' ? 'Inscripción cerrada' : ESTADO_TORNEO_LABEL[t.estado]}
        </Badge>
      </div>
      {t.descripcion && <p className="mt-1 line-clamp-2 text-sm text-noche/70">{t.descripcion}</p>}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-noche/70">
        <span className="inline-flex items-center gap-1.5"><CalendarRange className="h-4 w-4" aria-hidden />{rangoFechas(t.fecha_desde, t.fecha_hasta)}</span>
        {abierta && <span className="inline-flex items-center gap-1.5"><Hourglass className="h-4 w-4" aria-hidden />{faltaPara(t.cierre_inscripcion)}</span>}
        {t.formatos && <span className="w-full text-xs text-noche/60">{resumenFormatos(t.formatos)}</span>}
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <li key={c.id} className="rounded-md bg-vidrio px-2 py-1 text-xs">
            <span className="font-semibold">{c.categoria}</span>
            {c.inscriptas !== null ? (
              <span className="num ml-1.5 text-noche/60">{c.inscriptas}/{c.cupo_max}</span>
            ) : c.cupo_completo ? (
              <span className="ml-1.5 text-noche/60">· cupo completo</span>
            ) : null}
          </li>
        ))}
      </ul>
    </Link>
  )
}

export default function Torneos() {
  const [torneos, setTorneos] = useState<Torneo[] | null>(null)
  const [cats, setCats] = useState<TorneoCategoriaVista[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('torneos').select('*').neq('estado', 'borrador').order('fecha_desde', { ascending: false }),
      supabase.from('v_torneo_categorias').select('*').order('orden'),
    ]).then(([t, c]) => {
      setTorneos((t.data as Torneo[]) ?? [])
      setCats((c.data as TorneoCategoriaVista[]) ?? [])
    })
  }, [])

  if (!torneos) return <Spinner />

  const grupos = [
    { titulo: 'Con inscripción abierta', items: torneos.filter(inscripcionAbierta) },
    { titulo: 'En juego', items: torneos.filter((t) => t.estado === 'en_curso' || (t.estado === 'publicado' && !inscripcionAbierta(t))) },
    { titulo: 'Finalizados', items: torneos.filter((t) => t.estado === 'finalizado') },
  ].filter((g) => g.items.length)

  return (
    <>
      <Titulo bajada="Elegí un torneo para ver zonas, partidos y cuadro, o para inscribir a tu pareja.">Torneos</Titulo>
      {grupos.length === 0 && <Vacio titulo="Todavía no hay torneos publicados">Cuando la organización publique uno, lo vas a ver acá.</Vacio>}
      <div className="space-y-10">
        {grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className="mb-3 font-display text-xl font-semibold text-noche/70">{g.titulo}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {g.items.map((t) => <TorneoTarjeta key={t.id} t={t} cats={cats.filter((c) => c.torneo_id === t.id)} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
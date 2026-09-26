import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Torneo, TorneoCategoriaVista } from '../../lib/types'
import { ESTADO_CATEGORIA_LABEL, ESTADO_TORNEO_LABEL, fechaHora, rangoFechas } from '../../lib/formato'
import { Badge, Spinner, Titulo, Vacio } from '../../components/ui'

export default function AdminTorneos() {
  const [torneos, setTorneos] = useState<Torneo[] | null>(null)
  const [cats, setCats] = useState<TorneoCategoriaVista[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('torneos').select('*').order('fecha_desde', { ascending: false }),
      supabase.from('v_torneo_categorias').select('*').order('orden'),
    ]).then(([t, c]) => {
      setTorneos((t.data as Torneo[]) ?? [])
      setCats((c.data as TorneoCategoriaVista[]) ?? [])
    })
  }, [])

  if (!torneos) return <Spinner />
  return (
    <>
      <Titulo
        bajada="Creá torneos, habilitá categorías y gestioná cada una: inscriptos, zonas, programación y playoff."
        accion={<Link to="/admin/torneos/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-cancha px-4 py-2 text-sm font-semibold text-white hover:bg-cancha-claro"><Plus className="h-4 w-4" aria-hidden /> Nuevo torneo</Link>}
      >
        Armado de torneos
      </Titulo>
      {torneos.length === 0 ? <Vacio titulo="No hay torneos cargados" /> : (
        <div className="space-y-4">
          {torneos.map((t) => (
            <section key={t.id} className="rounded-xl bg-white p-5 ring-1 ring-noche/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/admin/torneos/${t.id}`} className="font-display text-2xl font-bold hover:text-cancha">{t.nombre}</Link>
                  <p className="text-sm text-noche/70">{rangoFechas(t.fecha_desde, t.fecha_hasta)} · cierre {fechaHora(t.cierre_inscripcion)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tono={t.estado === 'borrador' ? 'ambar' : 'azul'}>{ESTADO_TORNEO_LABEL[t.estado]}</Badge>
                  <Link to={`/torneos/${t.id}`} className="text-sm font-semibold text-cancha">Ver público</Link>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-noche/55"><th className="py-1.5 font-medium">Categoría</th><th className="font-medium">Parejas</th><th className="font-medium">Estado</th><th /></tr></thead>
                  <tbody>
                    {cats.filter((c) => c.torneo_id === t.id).map((c) => (
                      <tr key={c.id} className="border-t border-noche/5">
                        <td className="py-2 font-medium">{c.categoria}</td>
                        <td className="num">
                          {c.inscriptas ?? 0}/{c.cupo_max}
                          {(c.inscriptas ?? 0) < c.cupo_min && <span className="ml-2 text-xs text-amber-700">faltan {c.cupo_min - (c.inscriptas ?? 0)} para el mínimo</span>}
                        </td>
                        <td><Badge>{ESTADO_CATEGORIA_LABEL[c.estado]}</Badge></td>
                        <td className="text-right"><Link to={`/admin/torneos/${t.id}/categoria/${c.id}`} className="font-semibold text-cancha">Gestionar</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

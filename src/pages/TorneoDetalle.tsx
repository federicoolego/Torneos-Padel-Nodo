import { ReglasTorneo } from '../components/Reglas'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarRange, Hourglass, Settings2 } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { InscripcionVista, ParejaVista, PartidoVista, Torneo, TorneoCategoriaVista, Zona } from '../lib/types'
import { ESTADO_CATEGORIA_LABEL, fechaHora, faltaPara, rangoFechas } from '../lib/formato'
import { resumenFormatos } from '../lib/formatos'
import { parejaPuedeJugar } from '../lib/categorias'
import { Alerta, Badge, Button, Field, Modal, Select, Spinner, Tabs, Textarea, Vacio } from '../components/ui'
import { PartidoFila } from '../components/Partidos'
import { ZonaTabla } from '../components/Zonas'
import Bracket from '../components/Bracket'
import ResultadoModal from '../components/ResultadoModal'
import { inscripcionAbierta } from './Torneos'

type Tab = 'zonas' | 'partidos' | 'playoff'

export default function TorneoDetalle() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { jugador, esAdmin, esEditor } = useAuth()
  const [torneo, setTorneo] = useState<Torneo | null>(null)
  const [cats, setCats] = useState<TorneoCategoriaVista[]>([])
  const [tab, setTab] = useState<Tab>('zonas')
  const [zonas, setZonas] = useState<Zona[]>([])
  const [zonaCant, setZonaCant] = useState<Record<string, number>>({})
  const [partidos, setPartidos] = useState<PartidoVista[]>([])
  const [inscriptas, setInscriptas] = useState<InscripcionVista[]>([])
  const [cargando, setCargando] = useState(true)
  const [inscribir, setInscribir] = useState(false)
  const [soloMios, setSoloMios] = useState(false)
  const [elegido, setElegido] = useState<PartidoVista | null>(null)

  const tcId = params.get('cat') ?? cats[0]?.id
  const tc = cats.find((c) => c.id === tcId)

  const cargarTorneo = useCallback(async () => {
    const [t, c] = await Promise.all([
      supabase.from('torneos').select('*').eq('id', id!).maybeSingle(),
      supabase.from('v_torneo_categorias').select('*').eq('torneo_id', id!).order('orden'),
    ])
    setTorneo(t.data as Torneo)
    setCats((c.data as TorneoCategoriaVista[]) ?? [])
  }, [id])

  const cargarCategoria = useCallback(async () => {
    if (!tcId) return setCargando(false)
    setCargando(true)
    const [z, p, i] = await Promise.all([
      supabase.from('zonas').select('*, zona_parejas(inscripcion_id)').eq('torneo_categoria_id', tcId).order('nombre'),
      supabase.from('v_partidos').select('*').eq('torneo_categoria_id', tcId).order('ronda').order('orden'),
      supabase.from('v_inscripciones').select('*').eq('torneo_categoria_id', tcId).eq('estado', 'activa').order('created_at'),
    ])
    const zs = (z.data ?? []) as (Zona & { zona_parejas: { inscripcion_id: string }[] })[]
    setZonas(zs)
    setZonaCant(Object.fromEntries(zs.map((x) => [x.id, x.zona_parejas.length])))
    setPartidos((p.data as PartidoVista[]) ?? [])
    setInscriptas((i.data as InscripcionVista[]) ?? [])
    setCargando(false)
  }, [tcId])

  useEffect(() => { cargarTorneo() }, [cargarTorneo])
  useEffect(() => { cargarCategoria() }, [cargarCategoria])

  const nombres = useMemo(() => Object.fromEntries(inscriptas.map((i) => [i.id, i.nombre_corto])), [inscriptas])
  const misIds = useMemo(
    () => inscriptas.filter((i) => i.jugador1_id === jugador?.id || i.jugador2_id === jugador?.id).map((i) => i.id),
    [inscriptas, jugador],
  )

  if (!torneo) return <Spinner />

  const zonaPartidos = partidos.filter((p) => p.fase === 'zona')
  const playoff = partidos.filter((p) => p.fase !== 'zona')
  const listado = (soloMios ? partidos.filter((p) => misIds.includes(p.pareja_a_id ?? '') || misIds.includes(p.pareja_b_id ?? '')) : partidos)
    .filter((p) => p.estado !== 'bye')
    .sort((a, b) => (a.fecha_hora ?? '9999').localeCompare(b.fecha_hora ?? '9999') || a.ronda - b.ronda)

  const recargar = () => { cargarCategoria(); cargarTorneo() }

  return (
    <>
      <Link to="/torneos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-noche/60 hover:text-noche">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Torneos
      </Link>

      <header className="mb-6 rounded-2xl bg-noche p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-bold leading-none sm:text-5xl">{torneo.nombre}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
              <span className="inline-flex items-center gap-1.5"><CalendarRange className="h-4 w-4" aria-hidden />{rangoFechas(torneo.fecha_desde, torneo.fecha_hasta)}</span>
              <span className="inline-flex items-center gap-1.5"><Hourglass className="h-4 w-4" aria-hidden />
                {inscripcionAbierta(torneo) ? faltaPara(torneo.cierre_inscripcion) : `Inscripción cerró el ${fechaHora(torneo.cierre_inscripcion)}`}
              </span>
            </div>
            {torneo.formatos && (
              <p className="mt-2 text-sm text-white/75"><span className="font-semibold text-pelota">Formato</span> · {resumenFormatos(torneo.formatos)}</p>
            )}
            {torneo.descripcion && <p className="mt-3 max-w-2xl text-sm text-white/80">{torneo.descripcion}</p>}
          </div>
          <div className="flex gap-2">
            {esAdmin && (
              <Link to={`/admin/torneos/${torneo.id}`} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
                <Settings2 className="h-4 w-4" aria-hidden /> Administrar
              </Link>
            )}
            {inscripcionAbierta(torneo) && (
              <button onClick={() => setInscribir(true)} className="rounded-lg bg-pelota px-4 py-2 text-sm font-bold text-noche hover:brightness-95">
                Inscribir pareja
              </button>
            )}
          </div>
        </div>
        {torneo.observaciones && <p className="mt-4 border-t border-white/15 pt-3 text-xs text-white/65">{torneo.observaciones}</p>}
      </header>

      <div className="mb-6"><ReglasTorneo /></div>

      {cats.length === 0 ? (
        <Vacio titulo="Este torneo todavía no tiene categorías" />
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categoría">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ cat: c.id })}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
                  c.id === tcId ? 'bg-cancha text-white ring-cancha' : 'bg-white text-noche ring-noche/15 hover:ring-cancha'
                }`}
              >
                {c.categoria}
              </button>
            ))}
          </div>

          {tc && (
            <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-noche/70">
              <Badge tono={tc.estado === 'suspendida' ? 'rojo' : 'azul'}>{ESTADO_CATEGORIA_LABEL[tc.estado]}</Badge>
              {tc.inscriptas !== null ? (
                <>
                  <span className="num">{tc.inscriptas} de {tc.cupo_max} parejas</span>
                  {tc.estado === 'inscripcion' && tc.inscriptas < tc.cupo_min && (
                    <span>· se arma con {tc.cupo_min} como mínimo</span>
                  )}
                </>
              ) : tc.cupo_completo && tc.estado === 'inscripcion' ? (
                <span>Cupo completo</span>
              ) : null}
            </p>
          )}

          <Tabs<Tab>
            valor={tab}
            onChange={setTab}
            opciones={[
              { id: 'zonas', label: 'Zonas' },
              { id: 'partidos', label: 'Partidos', extra: <span className="num text-sm text-noche/40">{listado.length}</span> },
              { id: 'playoff', label: 'Playoff' },
            ]}
          />

          <div className="mt-6">
            {cargando ? <Spinner /> : tab === 'zonas' ? (
              zonas.length === 0 ? (
                <div className="space-y-4">
                  <Alerta>
                    {esEditor
                      ? 'Las zonas se arman al cerrar la inscripción. Mientras tanto, estas son las parejas anotadas.'
                      : misIds.length > 0
                        ? 'Tu pareja está inscripta. Las zonas se publican al cerrar la inscripción.'
                        : 'Las zonas se publican al cerrar la inscripción.'}
                  </Alerta>
                  {!esEditor ? null : inscriptas.length === 0 ? <Vacio titulo="Todavía no hay parejas inscriptas" /> : (
                    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {inscriptas.map((i, n) => (
                        <li key={i.id} className={`flex items-center gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-noche/10 ${misIds.includes(i.id) ? 'ring-2 ring-cancha' : ''}`}>
                          <span className="num w-6 font-display text-lg font-bold text-noche/40">{n + 1}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{i.nombre_corto}</p>
                            <p className="truncate text-xs text-noche/55">{i.jugador1} y {i.jugador2}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {zonas.map((z) => (
                    <ZonaTabla key={z.id} zona={z} nombres={nombres} cantidad={zonaCant[z.id] ?? 3} partidos={zonaPartidos.filter((p) => p.zona_id === z.id)} resaltarIds={misIds} />
                  ))}
                </div>
              )
            ) : tab === 'partidos' ? (
              <>
                {misIds.length > 0 && (
                  <label className="mb-4 inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} /> Ver solo mis partidos
                  </label>
                )}
                {listado.length === 0 ? <Vacio titulo="Todavía no hay partidos">Aparecen cuando la organización arma las zonas.</Vacio> : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {listado.map((p) => (
                      <PartidoFila key={p.id} p={p} puedeCargar={esEditor} esAdmin={esAdmin} onCambio={recargar} resaltarIds={misIds} />
                    ))}
                  </div>
                )}
              </>
            ) : playoff.length === 0 ? (
              <Vacio titulo="El cuadro todavía no está armado">Se arma cuando terminan todas las zonas.</Vacio>
            ) : (
              <Bracket partidos={playoff} resaltarIds={misIds} onElegir={esEditor ? setElegido : undefined} />
            )}
          </div>
        </>
      )}

      {elegido && (esAdmin || elegido.estado === 'pendiente') && (
        <ResultadoModal partido={elegido} esAdmin={esAdmin} onCerrar={() => setElegido(null)} onGuardado={() => { setElegido(null); recargar() }} />
      )}

      {inscribir && (
        <InscribirModal
          torneo={torneo}
          cats={cats}
          onCerrar={() => setInscribir(false)}
          onListo={(tcNuevo) => { setInscribir(false); setParams({ cat: tcNuevo }); recargar() }}
        />
      )}
    </>
  )
}

function InscribirModal({
  torneo,
  cats,
  onCerrar,
  onListo,
}: {
  torneo: Torneo
  cats: TorneoCategoriaVista[]
  onCerrar: () => void
  onListo: (tcId: string) => void
}) {
  const { jugador, categorias } = useAuth()
  const [parejas, setParejas] = useState<ParejaVista[] | null>(null)
  const [parejaId, setParejaId] = useState('')
  const [tcId, setTcId] = useState('')
  const [horario, setHorario] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('v_parejas')
      .select('*')
      .eq('activa', true)
      .or(`jugador1_id.eq.${jugador!.id},jugador2_id.eq.${jugador!.id}`)
      .then(({ data }) => setParejas((data as ParejaVista[]) ?? []))
  }, [jugador])

  const pareja = parejas?.find((p) => p.id === parejaId)
  const catDe = (id: number) => categorias.find((c) => c.id === id)!
  const habilitadas = pareja
    ? cats.filter((c) => c.estado === 'inscripcion' && parejaPuedeJugar(catDe(pareja.categoria1_id), catDe(pareja.categoria2_id), catDe(c.categoria_id)))
    : []

  async function confirmar() {
    setError('')
    if (!parejaId || !tcId) return setError('Elegí la pareja y la categoría')
    if (!horario.trim()) return setError('Contanos si tienen problemas de horario. Si no tienen, escribí "Ninguno"')
    setGuardando(true)
    const { error } = await supabase.from('inscripciones').insert({ torneo_categoria_id: tcId, pareja_id: parejaId, problemas_horario: horario.trim() })
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onListo(tcId)
  }

  return (
    <Modal abierto titulo={`Inscripción · ${torneo.nombre}`} onCerrar={onCerrar}>
      {!parejas ? <Spinner /> : parejas.length === 0 ? (
        <Vacio titulo="Necesitás una pareja activa" accion={<Link to="/mis-parejas" className="font-semibold text-cancha underline">Ir a Mis Parejas</Link>}>
          Creala con el DNI de tu compañero o compañera y volvé a inscribirte.
        </Vacio>
      ) : (
        <div className="space-y-4">
          <Field label="Pareja">
            <Select value={parejaId} onChange={(e) => { setParejaId(e.target.value); setTcId('') }}>
              <option value="" disabled>Elegí con quién jugás</option>
              {parejas.map((p) => (
                <option key={p.id} value={p.id}>{p.jugador1} ({p.categoria1}) y {p.jugador2} ({p.categoria2})</option>
              ))}
            </Select>
          </Field>
          {pareja && (
            <Field label="Categoría" hint="Solo aparecen las categorías en las que esta pareja puede jugar.">
              <Select value={tcId} onChange={(e) => setTcId(e.target.value)} disabled={habilitadas.length === 0}>
                <option value="" disabled>{habilitadas.length ? 'Elegí la categoría' : 'Ninguna categoría disponible para esta pareja'}</option>
                {habilitadas.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.cupo_completo}>
                    {c.categoria}{c.cupo_completo ? ' — cupo completo' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Problemas de horario" hint="Podés modificarlo hasta el cierre de inscripción.">
            <Textarea value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Ej: el viernes no podemos antes de las 20 h. Si no tienen, escribí 'Ninguno'." />
          </Field>
          <ReglasTorneo compacto />
          <Alerta tipo="aviso">
            Podés cancelar la inscripción hasta el {fechaHora(torneo.cierre_inscripcion)}. Después del cierre, si la pareja no se presenta, la inscripción se cobra igual.
          </Alerta>
          {error && <Alerta tipo="error">{error}</Alerta>}
          <div className="flex justify-end gap-2">
            <Button variante="secundario" onClick={onCerrar}>Cancelar</Button>
            <Button onClick={confirmar} cargando={guardando}>Confirmar inscripción</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
import { useState, type FormEvent } from 'react'
import { supabase, mensajeError } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Categoria, Genero } from '../../lib/types'
import { GENERO_LABEL } from '../../lib/categorias'
import { Alerta, Badge, Button, Card, Field, Input, Select, Titulo } from '../../components/ui'

const GENEROS: Genero[] = ['caballeros', 'damas', 'mixto']
const ordenSuma = (g: Genero, suma: number) => 100 + GENEROS.indexOf(g) * 20 + suma

export default function AdminCategorias() {
  const { categorias, recargarCategorias } = useAuth()
  const [genero, setGenero] = useState<Genero>('mixto')
  const [suma, setSuma] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  const nivel = categorias.filter((c) => c.tipo === 'nivel')
  const porSuma = categorias.filter((c) => c.tipo === 'suma')

  async function crear(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const n = Number(suma)
    if (!Number.isInteger(n) || n < 4 || n > 20) return setMsg({ tipo: 'error', txt: 'La suma tiene que ser un número entre 4 y 20' })
    if (porSuma.some((c) => c.genero === genero && c.suma === n)) return setMsg({ tipo: 'error', txt: 'Esa categoría ya existe; si está inactiva, activala' })
    setGuardando(true)
    const nombre = `Suma ${n} ${GENERO_LABEL[genero]}`
    const { error } = await supabase.from('categorias').insert({ nombre, genero, tipo: 'suma', suma: n, orden: ordenSuma(genero, n) })
    setGuardando(false)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setSuma('')
    setMsg({ tipo: 'ok', txt: `${nombre} creada` })
    recargarCategorias()
  }

  async function alternar(c: Categoria) {
    setMsg(null)
    const { error } = await supabase.from('categorias').update({ activa: !c.activa }).eq('id', c.id)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    recargarCategorias()
  }

  return (
    <>
      <Titulo bajada="Las categorías por suma se usan en los americanos: la pareja entra si la suma de sus categorías es igual o mayor (en caballeros una dama suma 2 más; en mixto va una dama y un caballero). Las inactivas no aparecen al armar un torneo.">
        Categorías
      </Titulo>
      {msg && <div className="mb-4"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-display text-2xl font-bold">Por suma</h2>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            {GENEROS.map((g) => (
              <div key={g}>
                <h3 className="mb-2 text-xs font-semibold text-noche/55">{GENERO_LABEL[g]}</h3>
                <ul className="space-y-1.5">
                  {porSuma.filter((c) => c.genero === g).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className={c.activa ? 'font-medium' : 'text-noche/40 line-through'}>Suma {c.suma}</span>
                      <button onClick={() => alternar(c)} className="text-xs font-semibold text-cancha hover:underline">
                        {c.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-2xl font-bold">Nueva categoría por suma</h2>
            <form onSubmit={crear} className="mt-3 space-y-3">
              <Field label="Género">
                <Select value={genero} onChange={(e) => setGenero(e.target.value as Genero)}>
                  {GENEROS.map((g) => <option key={g} value={g}>{GENERO_LABEL[g]}</option>)}
                </Select>
              </Field>
              <Field label="Suma" hint={suma ? `Se va a llamar "Suma ${suma} ${GENERO_LABEL[genero]}"` : undefined}>
                <Input inputMode="numeric" value={suma} onChange={(e) => setSuma(e.target.value.replace(/\D/g, '').slice(0, 2))} required />
              </Field>
              <Button type="submit" cargando={guardando}>Crear</Button>
            </form>
          </Card>
          <Card>
            <h2 className="font-display text-2xl font-bold">Por categoría</h2>
            <p className="mt-1 text-xs text-noche/60">Son las categorías de los jugadores; no se modifican.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {nivel.map((c) => <Badge key={c.id} tono="azul">{c.nombre}</Badge>)}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
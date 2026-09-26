import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Categoria, Jugador } from '../lib/types'

interface AuthState {
  session: Session | null
  jugador: Jugador | null
  categorias: Categoria[]
  cargando: boolean
  esAdmin: boolean
  esEditor: boolean
  refrescar: () => Promise<void>
  recargarCategorias: () => Promise<void>
  salir: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarJugador = useCallback(async (s: Session | null) => {
    if (!s) {
      setJugador(null)
      return
    }
    const { data } = await supabase.from('jugadores').select('*').eq('id', s.user.id).maybeSingle()
    setJugador((data as Jugador) ?? null)
  }, [])

  const recargarCategorias = useCallback(async () => {
    const { data } = await supabase.from('categorias').select('*').order('orden')
    setCategorias((data as Categoria[]) ?? [])
  }, [])

  useEffect(() => {
    recargarCategorias()

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await cargarJugador(data.session)
      setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s)
      // Evita llamar a Supabase dentro del callback (deadlock conocido de supabase-js)
      setTimeout(() => cargarJugador(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [cargarJugador, recargarCategorias])

  const value: AuthState = {
    session,
    jugador,
    categorias,
    cargando,
    esAdmin: jugador?.rol === 'administrador',
    esEditor: jugador?.rol === 'editor' || jugador?.rol === 'administrador',
    refrescar: () => cargarJugador(session),
    recargarCategorias,
    salir: async () => {
      await supabase.auth.signOut()
      setJugador(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

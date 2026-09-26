import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** false si el build se hizo sin las variables (la app muestra un aviso en vez de romper). */
export const configurado = Boolean(url && anonKey)

if (!configurado) {
  // eslint-disable-next-line no-console
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY al momento del build')
}

// createClient tira error con URL vacía: usamos un placeholder para que la app pueda mostrar el aviso.
export const supabase = createClient(url || 'https://sin-configurar.supabase.co', anonKey || 'sin-configurar', {
  auth: { persistSession: true, autoRefreshToken: true },
})

const DOMINIO = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'jugadores.padelapp.com.ar'

/** Cada jugador se autentica con un email sintético derivado de su DNI. */
export const dniAEmail = (dni: string) => `${dni.trim()}@${DOMINIO}`

const TRADUCCIONES: [RegExp, string][] = [
  [/invalid login credentials/i, 'DNI o contraseña incorrectos'],
  [/user already registered/i, 'Ya existe un jugador registrado con ese DNI'],
  [/password should be at least/i, 'La contraseña debe tener al menos 6 caracteres'],
  [/email not confirmed/i, 'La cuenta no está confirmada. Pedile al administrador que desactive la confirmación por email en Supabase'],
  [/duplicate key.*inscripciones_pareja_activa_unica/i, 'Esa pareja ya está inscripta en esta categoría'],
  [/network|failed to fetch/i, 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo'],
]

export function mensajeError(e: unknown): string {
  const msg =
    typeof e === 'string'
      ? e
      : (e as { message?: string })?.message ?? 'Ocurrió un error inesperado'
  for (const [re, txt] of TRADUCCIONES) if (re.test(msg)) return txt
  return msg
}

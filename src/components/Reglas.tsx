import { Clock3 } from 'lucide-react'
import { REGLAS_TORNEO } from '../lib/reglas'

/** Reglas de presentación que aplican a todos los torneos */
export function ReglasTorneo({ compacto = false }: { compacto?: boolean }) {
  return (
    <section
      aria-label="Reglas de presentación"
      className={`rounded-xl bg-pelota/25 ring-1 ring-pelota ${compacto ? 'p-3 text-xs' : 'p-4 text-sm'}`}
    >
      <p className="mb-1.5 flex items-center gap-2 font-semibold text-noche">
        <Clock3 className="h-4 w-4" aria-hidden /> Presentación a los partidos
      </p>
      <ul className="list-disc space-y-1 pl-5 text-noche/80">
        {REGLAS_TORNEO.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </section>
  )
}

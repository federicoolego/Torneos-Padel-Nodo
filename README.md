# Torneos de Pádel · NODO

App web para gestionar torneos de pádel: registro de jugadores, parejas, inscripciones, zonas, programación de partidos, carga de resultados y playoff.

**Stack:** Vite + React 18 + TypeScript + Tailwind CSS + React Router + Supabase (Auth, Postgres, RLS).

---

## 1. Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá y ejecutá completo `supabase/schema.sql`.
   - Crea enums, tablas, funciones, triggers, vistas, políticas RLS y los datos iniciales (categorías de nivel y por suma, y la sede *NODO* con Cancha 1, 2 y 3).
   - Es idempotente: arranca con `DROP ... IF EXISTS`, así que se puede volver a correr. **Ojo: si lo re-ejecutás, borra los datos.**
3. **Authentication → Providers → Email**: desactivá **Confirm email**.
   El login es por DNI + contraseña; internamente se usa un email sintético `<dni>@VITE_AUTH_EMAIL_DOMAIN` al que nunca se envían mails.
4. **Project Settings → API**: copiá la `Project URL` y la `anon public key`.

> El linter de Supabase puede advertir *"Security Definer View"* sobre las vistas `v_*`. Es intencional: exponen solo datos públicos (nombre, categoría) de otros jugadores sin abrir la tabla `jugadores` completa.

### Primer administrador

Registrate desde la app y después, en el SQL Editor:

```sql
update public.jugadores set rol = 'administrador' where dni = 'TU_DNI';
```

A partir de ahí los roles (jugador / editor / administrador) y las categorías se gestionan desde **Admin → Jugadores**.

### Reset de contraseña

Como el email es sintético, el reset lo hace el admin desde **Authentication → Users** en el dashboard de Supabase (buscar por `<dni>@dominio`).

---

## 2. Correr local

```bash
cp .env.example .env    # completar las 3 variables
npm install
npm run dev
```

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `VITE_AUTH_EMAIL_DOMAIN` | dominio del email sintético (ej. `jugadores.tudominio.com.ar`). **No lo cambies después de tener usuarios.** |

## 3. Deploy

### GitHub Pages (incluido)

El repo trae `.github/workflows/deploy.yml`, que compila y publica en cada push a `main`.

1. **Settings → Pages → Build and deployment → Source: GitHub Actions** (no "Deploy from a branch": eso publica el código fuente sin compilar y la página queda en blanco).
2. **Settings → Secrets and variables → Actions → New repository secret**: cargá `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_AUTH_EMAIL_DOMAIN`. Vite las embebe en el build, así que tienen que estar antes de que corra el workflow.
3. Hacé push (o **Actions → Deploy a GitHub Pages → Run workflow**). Queda en `https://<usuario>.github.io/<repo>/`.

El workflow setea la base al nombre del repo y copia `index.html` a `404.html` para que refrescar una ruta interna no dé 404.

### Vercel / Netlify

Build `npm run build`, output `dist`, las 3 variables de entorno. `vercel.json` ya tiene el rewrite SPA. Acá la base queda en `/`.

---

## Reglas de negocio implementadas

Todas se validan **en la base de datos** (triggers + RLS), no solo en el frontend.

**Categorías y elegibilidad**
- Caballeros 3ra–7ma, Damas 4ta–7ma. El jugador elige su categoría al registrarse; después solo el admin la cambia (queda historial en `jugador_categoria_historial`).
- Una pareja juega en la categoría de su **mejor jugador o superiores** (5ta + 6ta → 5ta, 4ta, 3ra).
- Caballeros nunca juegan en Damas. Una dama equivale a un caballero **2 categorías abajo** (Dama 5ta = Caballero 7ma). Pareja mixta → solo categorías de Caballeros.

**Parejas**
- Se crean con el DNI del compañero (se valida que exista). Solo parejas *activas* pueden inscribirse.

**Inscripciones**
- Cupo máximo 24 parejas por categoría; mínimo 6 para armar la categoría.
- Un jugador no puede estar en dos parejas inscriptas en la misma categoría del torneo.
- "Problemas de horario" editable y la inscripción cancelable **hasta el cierre**; después queda firme (se cobra aunque no se presenten).

**Zonas**
- Por defecto se arman `floor(N/3)` zonas (mayoría de 3, resto de 4), lo que da como máximo 16 clasificados. El admin puede elegir otra cantidad entre `ceil(N/4)` y `floor(N/3)`, generar aleatorio o por orden de inscripción, e intercambiar parejas entre zonas antes de cargar resultados.
- Zona de 3: todos contra todos, clasifican 2 (desempate: partidos ganados, diferencia de sets, diferencia de games).
- Zona de 4: 1v4 y 2v3 → ganadores y perdedores. 1° gana ganadores, 2° pierde ganadores, 3° gana perdedores. Los cruces se completan solos al cargar resultados.
- Formato: mejor de 3; el 3er set es **super tiebreak a 11** (diferencia de 2).

**Playoff**
- Mejor de 3 sets normales. Se arma según la cantidad de clasificados: final, semis, cuartos u octavos.
- Siembra: 1° de cada zona, luego 2°s, luego 3°s. Si no es potencia de 2, los mejores sembrados tienen **bye** (pasan directo). Se evita que dos parejas de la misma zona se crucen en primera ronda cuando es posible.
- Los ganadores avanzan automáticamente. Al cargar la final la categoría queda *finalizada*.

**Resultados**
- W.O. cuenta como 2-0 en sets y 12-0 en games. El super tiebreak cuenta como 1 game.
- **Editor**: solo carga resultados en partidos pendientes.
- **Admin**: carga, edita y anula. No se puede modificar un partido si el siguiente (al que avanzó el ganador) ya tiene resultado: primero hay que anular ese.

---

## Estructura

```
supabase/schema.sql      Script completo de base de datos
src/lib/                 Cliente Supabase, tipos, helpers (categorías, fechas, validación de sets)
src/context/             AuthContext (sesión + perfil)
src/components/          UI base, Layout, Marcador, Zonas, Bracket, modal de resultado
src/pages/               Perfil, Torneos, TorneoDetalle (Zonas/Partidos/Playoff),
                         Mis Inscripciones, Mis Parejas, Mis Torneos, Login, Registro
src/pages/admin/         Torneos, alta/edición, gestión por categoría
                         (Inscriptos/Zonas/Programación/Playoff), Jugadores, Sedes
```

## Flujo típico del admin

1. **Sedes** (ya vienen las 3 cargadas; desactivá las que no uses).
2. **Torneos → Nuevo**: datos, fecha de cierre y categorías habilitadas. Publicarlo para que se vea.
3. Tras el cierre, en cada categoría: **Zonas → Generar** (mínimo 6 inscriptas).
4. **Programación**: asignar sede, fecha y hora a cada partido (teniendo a la vista los problemas de horario).
5. Editores/admin cargan resultados. Cuando terminan las zonas: **Playoff → Generar**.

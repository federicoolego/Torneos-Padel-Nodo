-- =====================================================================
--  MIGRACIÓN · NODO · Categorías 8va + gestión de categorías de nivel
-- ---------------------------------------------------------------------
--  1. Agrega 8va Caballeros y 8va Damas.
--  2. El admin puede crear, desactivar y eliminar categorías de nivel
--     (además de las de suma), desde Admin → Categorías.
--     * Eliminar: solo si nadie la usa (sin jugadores, sin torneos y sin
--       historial). Si se usa, la opción es desactivarla.
--     * Desactivada: los jugadores que ya la tienen la conservan, pero no
--       se puede elegir al registrarse ni al recategorizar, y no aparece
--       al armar torneos.
--
--  Pegalo entero en el SQL Editor de Supabase. Es re-ejecutable.
-- =====================================================================

-- 0. La identidad de categorias puede haber quedado atrás si alguna vez se
--    insertaron ids a mano: la alineamos para que los inserts no choquen.
select setval(pg_get_serial_sequence('public.categorias', 'id'),
              (select coalesce(max(id), 1) from public.categorias));

-- 1. No puede haber dos categorías de nivel iguales (mismo género y nivel)
create unique index if not exists categorias_nivel_unica
  on public.categorias (genero, nivel) where tipo = 'nivel';

-- 2. Orden de las categorías de nivel: caballeros 1..9, damas 11..19
--    (las de suma siguen desde 100). Es lo mismo que usa la app al crear.
update public.categorias
set orden = case genero when 'caballeros' then nivel else 10 + nivel end
where tipo = 'nivel';

-- 3. 8va Caballeros y 8va Damas
insert into public.categorias (nombre, genero, tipo, nivel, orden)
select v.nombre, v.genero::public.genero_categoria, 'nivel', 8, v.orden
from (values ('8va Caballeros', 'caballeros', 8), ('8va Damas', 'damas', 18)) v(nombre, genero, orden)
where not exists (
  select 1 from public.categorias c
  where c.tipo = 'nivel' and c.genero = v.genero::public.genero_categoria and c.nivel = 8
);

-- 4. La categoría de un jugador: siempre de nivel y, al asignarla, activa
create or replace function public.jugadores_validar_categoria()
returns trigger language plpgsql set search_path = public as $$
declare c public.categorias;
begin
  select * into c from public.categorias where id = new.categoria_id;
  if c.tipo is distinct from 'nivel' then
    raise exception 'La categoría de un jugador tiene que ser de nivel (no puede ser una "Suma")';
  end if;
  if not c.activa and (tg_op = 'INSERT' or new.categoria_id is distinct from old.categoria_id) then
    raise exception 'La categoría % está desactivada', c.nombre;
  end if;
  return new;
end $$;

-- 5. Eliminar una categoría (solo admin y solo si no se usa)
create or replace function public.admin_eliminar_categoria(p_categoria smallint)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.categorias;
  n int;
begin
  if not public.es_sistema_o_admin() then
    raise exception 'Solo el administrador puede eliminar categorías';
  end if;
  select * into c from public.categorias where id = p_categoria for update;
  if c.id is null then raise exception 'La categoría no existe'; end if;

  select count(*) into n from public.jugadores where categoria_id = p_categoria;
  if n > 0 then
    raise exception 'No se puede eliminar %: tiene % jugador(es). Recategorizalos o desactivala.', c.nombre, n;
  end if;
  if exists (select 1 from public.torneo_categorias where categoria_id = p_categoria) then
    raise exception 'No se puede eliminar %: ya se usó en torneos. Desactivala para que no aparezca más.', c.nombre;
  end if;
  if exists (select 1 from public.jugador_categoria_historial
             where p_categoria in (categoria_anterior_id, categoria_nueva_id)) then
    raise exception 'No se puede eliminar %: figura en el historial de categorías de jugadores. Desactivala.', c.nombre;
  end if;

  delete from public.categorias where id = p_categoria;
  perform public.registrar('config', 'Categoría eliminada: ' || c.nombre);
end $$;

revoke execute on function public.admin_eliminar_categoria(smallint) from anon, public;
grant execute on function public.admin_eliminar_categoria(smallint) to authenticated;

-- 6. Control: categorías de nivel
select id, nombre, genero, nivel, orden, activa
from public.categorias where tipo = 'nivel' order by orden;
-- ============================================================
-- EL CASINO VILA-REAL — Sistema de reservas de mesa
-- Pegar este archivo entero en: Supabase → SQL Editor → Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================

-- ---------- 1. TABLAS ----------

-- Horario en el que SE ACEPTAN RESERVAS
-- (no es el horario de apertura del local: el bar abre antes)
create table if not exists public.franjas_horario (
  id            uuid primary key default gen_random_uuid(),
  dia_semana    int  not null check (dia_semana between 0 and 6),  -- 0 = domingo
  servicio      text not null default 'comida',                    -- comida | cena
  hora_inicio   time not null,
  hora_fin      time not null,   -- hora de la ÚLTIMA entrada admitida
  aforo_maximo  int  not null check (aforo_maximo > 0),            -- comensales simultáneos
  duracion_min  int  not null default 90 check (duracion_min > 0), -- cuánto ocupa una mesa
  -- Tope de cocina: cuánta gente puede ENTRAR en cada tramo. Es distinto del
  -- aforo, que cuenta a los que están sentados. Sin esto, cuarenta comensales
  -- pueden reservar todos a las 21:00 y la cocina revienta.
  max_por_slot  int,             -- null = sin tope
  activa        boolean not null default true,
  constraint franja_coherente check (hora_fin >= hora_inicio)
);

-- Aparte del create, para poder reejecutar sobre instalaciones anteriores.
alter table public.franjas_horario add column if not exists max_por_slot int;

alter table public.franjas_horario drop constraint if exists franja_tope_positivo;
alter table public.franjas_horario add  constraint franja_tope_positivo
  check (max_por_slot is null or max_por_slot > 0);

-- Un solo turno por día y servicio, para que la tabla del panel sea estable
create unique index if not exists idx_franja_dia_servicio
  on public.franjas_horario (dia_semana, servicio);

-- Cierres puntuales: un día suelto, un tramo de horas, o un periodo entero
-- de vacaciones. fecha_fin nula = solo el día de "fecha", que es como
-- funcionaba antes, así que las filas antiguas siguen valiendo.
create table if not exists public.bloqueos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  fecha_fin   date,          -- null = solo ese día
  hora_inicio time,          -- null = el día (o el periodo) entero
  hora_fin    time,
  motivo      text,
  creado_en   timestamptz not null default now()
);

-- Aparte del create, para que el esquema se pueda reejecutar sobre
-- instalaciones anteriores donde la tabla ya existía sin esta columna.
alter table public.bloqueos add column if not exists fecha_fin date;

alter table public.bloqueos drop constraint if exists bloqueo_periodo_coherente;
alter table public.bloqueos add  constraint bloqueo_periodo_coherente
  check (fecha_fin is null or fecha_fin >= fecha);

create table if not exists public.reservas (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  telefono     text not null,
  email        text,
  num_personas int  not null check (num_personas between 1 and 30),
  fecha        date not null,
  hora         time not null,
  notas        text,
  estado       text not null default 'confirmada' check (estado in ('confirmada','cancelada')),
  creado_en    timestamptz not null default now(),
  cancelada_en timestamptz
);

-- Ajustes generales, editables sin tocar código
create table if not exists public.config (
  clave text primary key,
  valor text not null
);

-- Lista blanca del personal autorizado.
-- Tener cuenta en Supabase NO basta para ver las reservas: hay que estar aquí.
-- Así, si alguna vez se reabre el registro público por error, sigue sin haber fuga.
create table if not exists public.personal (
  id        uuid primary key references auth.users(id) on delete cascade,
  nombre    text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_reservas_fecha on public.reservas (fecha) where estado = 'confirmada';
create index if not exists idx_bloqueos_fecha on public.bloqueos (fecha);
create index if not exists idx_franjas_dia    on public.franjas_horario (dia_semana) where activa;


-- ---------- 2. SEGURIDAD (RLS) ----------
-- Regla de oro: el visitante NUNCA puede leer reservas (son datos personales).
-- Solo puede crearlas a través de la función controlada más abajo.

alter table public.reservas        enable row level security;
alter table public.franjas_horario enable row level security;
alter table public.bloqueos        enable row level security;
alter table public.config          enable row level security;
alter table public.personal        enable row level security;

-- ¿Quien está pidiendo esto trabaja en El Casino?
-- security definer para que pueda consultar la lista sin caer en su propia RLS.
create or replace function public.es_personal()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from personal p where p.id = auth.uid());
$fn$;

revoke all on function public.es_personal() from public;
grant execute on function public.es_personal() to authenticated;

-- Cada miembro del personal solo se ve a sí mismo; nadie más ve la lista.
drop policy if exists "personal se ve a si mismo" on public.personal;
create policy "personal se ve a si mismo"
  on public.personal for select to authenticated using (id = auth.uid());

-- Reservas: solo el personal de la lista blanca las ve y las modifica.
-- Estar autenticado no basta: hay que figurar en la tabla personal.
drop policy if exists "personal lee reservas"      on public.reservas;
drop policy if exists "personal modifica reservas" on public.reservas;
create policy "personal lee reservas"
  on public.reservas for select to authenticated using (public.es_personal());
create policy "personal modifica reservas"
  on public.reservas for update to authenticated
  using (public.es_personal()) with check (public.es_personal());
-- Ojo: NO hay política de insert para anon. Se inserta solo vía crear_reserva().

-- Horarios y bloqueos: lectura pública (hacen falta para pintar el calendario).
drop policy if exists "todos leen franjas"     on public.franjas_horario;
drop policy if exists "personal edita franjas" on public.franjas_horario;
create policy "todos leen franjas"
  on public.franjas_horario for select to anon, authenticated using (true);
create policy "personal edita franjas"
  on public.franjas_horario for all to authenticated
  using (public.es_personal()) with check (public.es_personal());

-- Los bloqueos NO se leen públicamente: el motivo del cierre es interno.
-- El calendario de la web usa la vista bloqueos_publicos (sección 7).
drop policy if exists "todos leen bloqueos"     on public.bloqueos;
drop policy if exists "personal edita bloqueos" on public.bloqueos;
create policy "personal edita bloqueos"
  on public.bloqueos for all to authenticated
  using (public.es_personal()) with check (public.es_personal());

drop policy if exists "todos leen config"     on public.config;
drop policy if exists "personal edita config" on public.config;
create policy "todos leen config"
  on public.config for select to anon, authenticated using (true);
create policy "personal edita config"
  on public.config for all to authenticated
  using (public.es_personal()) with check (public.es_personal());


-- ---------- 3. HUECOS DISPONIBLES ----------
-- Devuelve SOLO horas y plazas libres. Jamás datos de clientes.
create or replace function public.huecos_disponibles(p_fecha date, p_personas int default 2)
returns table (hora text, libres int, completo boolean)
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_slot       int := coalesce((select valor::int from config where clave = 'slot_min'), 15);
  -- En minutos, no en horas: así se puede permitir reservar para dentro de media
  -- hora, que es lo normal en un bar donde la gente decide sobre la marcha.
  v_antelacion int := coalesce((select valor::int from config where clave = 'antelacion_min_minutos'), 30);
  v_dias_max   int := coalesce((select valor::int from config where clave = 'dias_max_vista'), 60);
begin
  -- Fuera del rango permitido: no se ofrece nada
  if p_fecha < current_date or p_fecha > current_date + v_dias_max then
    return;
  end if;

  -- Día entero cerrado, ya sea un día suelto o dentro de un periodo de vacaciones
  if exists (
    select 1 from bloqueos b
    where p_fecha between b.fecha and coalesce(b.fecha_fin, b.fecha)
      and b.hora_inicio is null
  ) then
    return;
  end if;

  return query
  with slots as (
    select f.aforo_maximo,
           f.duracion_min,
           f.max_por_slot,
           generate_series(
             (p_fecha + f.hora_inicio)::timestamp,
             (p_fecha + f.hora_fin)::timestamp,
             make_interval(mins => v_slot)
           ) as inicio
    from franjas_horario f
    where f.activa
      and f.dia_semana = extract(dow from p_fecha)::int
  ),
  validos as (
    select s.aforo_maximo,
           s.duracion_min,
           s.max_por_slot,
           s.inicio,
           s.inicio + make_interval(mins => s.duracion_min) as fin
    from slots s
    -- Respeta la antelación mínima (hora española)
    where (s.inicio at time zone 'Europe/Madrid') >= now() + make_interval(mins => v_antelacion)
      -- Descarta tramos cerrados puntualmente, también dentro de un periodo
      and not exists (
        select 1 from bloqueos b
        where p_fecha between b.fecha and coalesce(b.fecha_fin, b.fecha)
          and b.hora_inicio is not null
          and s.inicio < (p_fecha + b.hora_fin)
          and (s.inicio + make_interval(mins => s.duracion_min)) > (p_fecha + b.hora_inicio)
      )
  ),
  -- LÍMITE 1 · SALA: cuánta gente está SENTADA a esa hora
  ocupacion as (
    select v.inicio,
           v.aforo_maximo,
           v.max_por_slot,
           coalesce(sum(r.num_personas), 0)::int as sentadas
    from validos v
    left join reservas r
      on  r.fecha  = p_fecha
      and r.estado = 'confirmada'
      -- Solapamiento real de intervalos, sobre fecha+hora completa.
      -- Comparar solo la hora rompe cuando el turno cruza medianoche:
      -- 22:00 + 120 min da 00:00, que como hora suelta es el principio del día.
      and (p_fecha + r.hora) < v.fin
      and (p_fecha + r.hora + make_interval(mins => v.duracion_min)) > v.inicio
    group by v.inicio, v.aforo_maximo, v.max_por_slot
  ),
  -- LÍMITE 2 · COCINA: cuánta gente ENTRA en ese tramo concreto.
  -- Es lo que evita que cuarenta comensales reserven todos a las 21:00
  -- y a la cocina le entren cuarenta primeros a la vez.
  llegadas as (
    select v.inicio,
           coalesce(sum(r.num_personas), 0)::int as entran
    from validos v
    left join reservas r
      on  r.fecha  = p_fecha
      and r.estado = 'confirmada'
      and (p_fecha + r.hora) >= v.inicio
      and (p_fecha + r.hora) <  v.inicio + make_interval(mins => v_slot)
    group by v.inicio
  ),
  -- Manda el más estrecho de los dos. Sin tope de cocina, solo cuenta la sala.
  disponible as (
    select o.inicio,
           least(
             greatest(o.aforo_maximo - o.sentadas, 0),
             coalesce(o.max_por_slot - l.entran, 2147483647)
           ) as libres
    from ocupacion o
    join llegadas l on l.inicio = o.inicio
  )
  select to_char(d.inicio, 'HH24:MI')::text,
         greatest(d.libres, 0)::int,
         (d.libres < p_personas)
  from disponible d
  order by d.inicio;
end;
$func$;


-- ---------- 4. CREAR RESERVA ----------
-- A prueba de reservas simultáneas: el bloqueo por franja serializa
-- dos intentos a la misma hora, uno espera al otro.
create or replace function public.crear_reserva(
  p_nombre   text,
  p_telefono text,
  p_email    text,
  p_personas int,
  p_fecha    date,
  p_hora     time,
  p_notas    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_franja   record;
  v_ocupadas int;
  v_entran   int;
  v_slot     int := coalesce((select valor::int from config where clave = 'slot_min'), 15);
  v_id       uuid;
begin
  -- Validación en servidor: nunca fiarse solo del navegador
  if p_nombre is null or length(btrim(p_nombre)) < 3 then
    return jsonb_build_object('ok', false, 'error', 'nombre_invalido');
  end if;

  if p_telefono is null or length(regexp_replace(p_telefono, '[^0-9]', '', 'g')) < 9 then
    return jsonb_build_object('ok', false, 'error', 'telefono_invalido');
  end if;

  -- El correo es obligatorio: sin él no hay confirmación ni enlace para
  -- cancelar, y el cliente se queda sin comprobante de nada.
  if p_email is null or btrim(p_email) = ''
     or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email_invalido');
  end if;

  if p_personas is null or p_personas < 1 or p_personas > 30 then
    return jsonb_build_object('ok', false, 'error', 'personas_invalido');
  end if;

  -- Serializa los intentos sobre la misma fecha + hora
  perform pg_advisory_xact_lock(hashtextextended(p_fecha::text || p_hora::text, 0));

  select f.* into v_franja
  from franjas_horario f
  where f.activa
    and f.dia_semana = extract(dow from p_fecha)::int
    and p_hora between f.hora_inicio and f.hora_fin
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  -- Cierres: un día suelto o cualquier día dentro de un periodo de vacaciones
  if exists (
    select 1 from bloqueos b
    where p_fecha between b.fecha and coalesce(b.fecha_fin, b.fecha)
      and (b.hora_inicio is null
           or ((p_fecha + p_hora) < (p_fecha + b.hora_fin)
               and (p_fecha + p_hora + make_interval(mins => v_franja.duracion_min))
                   > (p_fecha + b.hora_inicio)))
  ) then
    return jsonb_build_object('ok', false, 'error', 'fecha_bloqueada');
  end if;

  -- Recuento DENTRO de la transacción: aquí ya no cabe la condición de carrera
  select coalesce(sum(r.num_personas), 0)::int into v_ocupadas
  from reservas r
  where r.fecha = p_fecha
    and r.estado = 'confirmada'
    -- Mismo criterio que huecos_disponibles: fecha+hora, no la hora suelta
    and (p_fecha + r.hora) < (p_fecha + p_hora + make_interval(mins => v_franja.duracion_min))
    and (p_fecha + r.hora + make_interval(mins => v_franja.duracion_min)) > (p_fecha + p_hora);

  if v_ocupadas + p_personas > v_franja.aforo_maximo then
    return jsonb_build_object('ok', false, 'error', 'sin_aforo',
                              'libres', greatest(v_franja.aforo_maximo - v_ocupadas, 0));
  end if;

  -- Segundo límite: la cocina. Cuenta solo a los que ENTRAN en este mismo
  -- tramo, no a los que ya están sentados de antes.
  if v_franja.max_por_slot is not null then
    select coalesce(sum(r.num_personas), 0)::int into v_entran
    from reservas r
    where r.fecha = p_fecha
      and r.estado = 'confirmada'
      and (p_fecha + r.hora) >= (p_fecha + p_hora)
      and (p_fecha + r.hora) <  (p_fecha + p_hora + make_interval(mins => v_slot));

    if v_entran + p_personas > v_franja.max_por_slot then
      return jsonb_build_object('ok', false, 'error', 'tope_cocina',
                                'libres', greatest(v_franja.max_por_slot - v_entran, 0));
    end if;
  end if;

  insert into reservas (nombre, telefono, email, num_personas, fecha, hora, notas)
  values (btrim(p_nombre),
          btrim(p_telefono),
          nullif(btrim(coalesce(p_email, '')), ''),
          p_personas,
          p_fecha,
          p_hora,
          nullif(btrim(coalesce(p_notas, '')), ''))
  returning id into v_id;

  return jsonb_build_object('ok', true,
                            'id', v_id,
                            'fecha', p_fecha,
                            'hora', to_char(p_hora, 'HH24:MI'));
end;
$func$;

-- El visitante solo puede ejecutar estas dos funciones, nada más
revoke all on function public.huecos_disponibles(date, int) from public;
revoke all on function public.crear_reserva(text, text, text, int, date, time, text) from public;
grant execute on function public.huecos_disponibles(date, int) to anon, authenticated;
grant execute on function public.crear_reserva(text, text, text, int, date, time, text) to anon, authenticated;


-- ---------- 4-bis. ALTA MANUAL DESDE EL PANEL ----------
-- En un bar de pueblo la mayoría de las reservas siguen entrando por teléfono.
-- Si esas no se apuntan aquí, el aforo que calcula la web es mentira y acabará
-- aceptando mesas que ya están dadas.
--
-- Las reglas son distintas a las de la web, y es a propósito:
--   · el correo es opcional, porque por teléfono mucha gente no lo da
--   · no hay antelación mínima: si llaman a las 13:00 para las 13:30, vale
--   · se puede forzar por encima del aforo. En una sala real se aprietan mesas,
--     y si el sistema se lo impide, el jefe vuelve a la libreta y aquí se acabó
--     todo lo demás.
create or replace function public.crear_reserva_personal(
  p_nombre   text,
  p_telefono text,
  p_email    text,
  p_personas int,
  p_fecha    date,
  p_hora     time,
  p_notas    text default null,
  p_forzar   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_franja   record;
  v_ocupadas int;
  v_entran   int;
  v_slot     int := coalesce((select valor::int from config where clave = 'slot_min'), 15);
  v_id       uuid;
begin
  -- Aunque la función esté concedida a cualquier autenticado, solo actúa
  -- para quien figure en la lista blanca de personal.
  if not public.es_personal() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  if p_nombre is null or length(btrim(p_nombre)) < 2 then
    return jsonb_build_object('ok', false, 'error', 'nombre_invalido');
  end if;

  if p_telefono is null or length(regexp_replace(p_telefono, '[^0-9]', '', 'g')) < 9 then
    return jsonb_build_object('ok', false, 'error', 'telefono_invalido');
  end if;

  -- Aquí el correo SÍ puede ir vacío, al contrario que en la web
  if p_email is not null and btrim(p_email) <> ''
     and p_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email_invalido');
  end if;

  if p_personas is null or p_personas < 1 or p_personas > 30 then
    return jsonb_build_object('ok', false, 'error', 'personas_invalido');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fecha::text || p_hora::text, 0));

  select f.* into v_franja
  from franjas_horario f
  where f.activa
    and f.dia_semana = extract(dow from p_fecha)::int
    and p_hora between f.hora_inicio and f.hora_fin
  limit 1;

  if not found then
    -- Sin franja no hay aforo contra el que comparar. Se avisa, pero si el
    -- personal insiste (una comida privada un lunes) se deja pasar.
    if not p_forzar then
      return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
    end if;
  else
    select coalesce(sum(r.num_personas), 0)::int into v_ocupadas
    from reservas r
    where r.fecha = p_fecha
      and r.estado = 'confirmada'
      and (p_fecha + r.hora) < (p_fecha + p_hora + make_interval(mins => v_franja.duracion_min))
      and (p_fecha + r.hora + make_interval(mins => v_franja.duracion_min)) > (p_fecha + p_hora);

    if v_ocupadas + p_personas > v_franja.aforo_maximo and not p_forzar then
      return jsonb_build_object('ok', false, 'error', 'sin_aforo',
                                'libres', greatest(v_franja.aforo_maximo - v_ocupadas, 0));
    end if;

    -- El tope de cocina también avisa aquí: las reservas de teléfono son la
    -- mayoría, y si estas se lo saltan sin más, el escalonado no sirve de nada.
    -- Se puede forzar igual, que para eso decide el personal.
    if v_franja.max_por_slot is not null and not p_forzar then
      select coalesce(sum(r.num_personas), 0)::int into v_entran
      from reservas r
      where r.fecha = p_fecha
        and r.estado = 'confirmada'
        and (p_fecha + r.hora) >= (p_fecha + p_hora)
        and (p_fecha + r.hora) <  (p_fecha + p_hora + make_interval(mins => v_slot));

      if v_entran + p_personas > v_franja.max_por_slot then
        return jsonb_build_object('ok', false, 'error', 'tope_cocina',
                                  'libres', greatest(v_franja.max_por_slot - v_entran, 0));
      end if;
    end if;
  end if;

  insert into reservas (nombre, telefono, email, num_personas, fecha, hora, notas)
  values (btrim(p_nombre),
          btrim(p_telefono),
          nullif(btrim(coalesce(p_email, '')), ''),
          p_personas,
          p_fecha,
          p_hora,
          nullif(btrim(coalesce(p_notas, '')), ''))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$func$;

revoke all on function
  public.crear_reserva_personal(text, text, text, int, date, time, text, boolean) from public;
grant execute on function
  public.crear_reserva_personal(text, text, text, int, date, time, text, boolean) to authenticated;


-- ---------- 5. CANCELAR DESDE EL CORREO ----------
-- Cada reserva lleva un testigo secreto. Quien reciba el enlace del correo
-- puede cancelar ESA reserva, sin cuenta ni contraseña. Sin el testigo,
-- conocer el id no sirve de nada.
alter table public.reservas
  add column if not exists token_cancelacion uuid not null default gen_random_uuid();

-- Consulta con testigo: deja enseñar al cliente QUÉ va a cancelar antes de
-- hacerlo. Devuelve lo justo para reconocerla, nunca el teléfono ni el correo.
create or replace function public.ver_reserva(p_id uuid, p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $func$
declare
  r record;
begin
  select * into r from reservas
  where id = p_id and token_cancelacion = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;

  return jsonb_build_object('ok', true,
    'nombre', r.nombre, 'fecha', r.fecha,
    'hora', to_char(r.hora, 'HH24:MI'), 'personas', r.num_personas,
    'estado', r.estado,
    'pasada', (r.fecha + r.hora) < (now() at time zone 'Europe/Madrid'));
end;
$func$;

revoke all on function public.ver_reserva(uuid, uuid) from public;
grant execute on function public.ver_reserva(uuid, uuid) to anon, authenticated;

create or replace function public.cancelar_reserva(p_id uuid, p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  r record;
begin
  select * into r from reservas
  where id = p_id and token_cancelacion = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;

  -- Que ya estuviera cancelada no es un error: el cliente pulsó dos veces
  if r.estado = 'cancelada' then
    return jsonb_build_object('ok', true, 'ya_estaba', true,
      'nombre', r.nombre, 'fecha', r.fecha,
      'hora', to_char(r.hora, 'HH24:MI'), 'personas', r.num_personas);
  end if;

  if (r.fecha + r.hora) < (now() at time zone 'Europe/Madrid') then
    return jsonb_build_object('ok', false, 'error', 'ya_pasada');
  end if;

  update reservas
     set estado = 'cancelada', cancelada_en = now()
   where id = p_id;

  return jsonb_build_object('ok', true, 'ya_estaba', false,
    'nombre', r.nombre, 'fecha', r.fecha,
    'hora', to_char(r.hora, 'HH24:MI'), 'personas', r.num_personas);
end;
$func$;

revoke all on function public.cancelar_reserva(uuid, uuid) from public;
grant execute on function public.cancelar_reserva(uuid, uuid) to anon, authenticated;


-- ---------- 6. ¿CERRADO O LLENO? ----------
-- Sin esto, un día de vacaciones y un día completo se ven igual desde la web,
-- y al cliente le sale "no quedan mesas" cuando en realidad no abrimos.
create or replace function public.motivo_cierre(p_fecha date)
returns text
language plpgsql
stable
security definer
set search_path = public
as $func$
begin
  if exists (select 1 from bloqueos b
             where p_fecha between b.fecha and coalesce(b.fecha_fin, b.fecha)
               and b.hora_inicio is null) then
    return 'cerrado_puntual';        -- vacaciones, festivo, un privado
  end if;

  if not exists (select 1 from franjas_horario f
                 where f.activa and f.dia_semana = extract(dow from p_fecha)::int) then
    return 'cierre_semanal';         -- ese día de la semana no se abre nunca
  end if;

  return null;                       -- abierto: si no hay huecos, está completo
end;
$func$;

revoke all on function public.motivo_cierre(date) from public;
grant execute on function public.motivo_cierre(date) to anon, authenticated;


-- ---------- 7. EL MOTIVO DEL CIERRE ES PRIVADO ----------
-- El calendario necesita saber QUÉ días están cerrados, pero no POR QUÉ.
-- "Boda de la hija" o "comida de empresa" no son asunto del visitante.
drop policy if exists "todos leen bloqueos" on public.bloqueos;
-- El personal sigue viéndolos enteros por la política "personal edita bloqueos".

-- Vista con lo justo para pintar el calendario. Al no llevar security_invoker,
-- se ejecuta con permisos del propietario y no expone la tabla de debajo.
-- Se recrea porque ahora incluye fecha_fin, y una vista no admite
-- añadir columnas con create or replace.
drop view if exists public.bloqueos_publicos;
create view public.bloqueos_publicos as
  select fecha, fecha_fin, hora_inicio, hora_fin from public.bloqueos;

grant select on public.bloqueos_publicos to anon, authenticated;


-- ---------- 8. AVISO POR CORREO ----------
-- Cuelga del cambio de estado, no de quien lo provoca. Así el correo sale
-- igual si cancela el cliente desde el enlace, el personal desde el panel
-- o alguien desde el propio Supabase.
--
-- pg_net hace la petición en segundo plano: guardar la reserva no espera
-- al correo, de modo que si Resend tarda, el cliente no se queda colgado.
create extension if not exists pg_net;

create or replace function public.avisar_por_correo()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_url   text := nullif((select valor from config where clave = 'url_funcion_correo'), '');
  v_clave text := coalesce((select valor from config where clave = 'clave_api_correo'), '');
  v_tipo  text;
begin
  -- Sin URL configurada no hay correo, pero la reserva se guarda igual:
  -- nunca se pierde una mesa porque falle el aviso.
  if v_url is null then
    return null;
  end if;

  if TG_OP = 'INSERT' then
    v_tipo := 'nueva';
  elsif NEW.estado = 'cancelada' and OLD.estado is distinct from 'cancelada' then
    v_tipo := 'cancelada';
  else
    return null;
  end if;

  -- La puerta de entrada de Supabase rechaza toda petición sin cabecera de
  -- autorización, aunque la función no verifique JWT. Va la clave publicable,
  -- que no es secreta: viaja ya en el JavaScript de la web.
  --
  -- Que sea pública no abre ningún agujero: la función solo envía a la
  -- dirección guardada en la reserva y descarta avisos de más de 10 minutos,
  -- así que conocerla no sirve para mandar correos a nadie más.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'apikey',        v_clave,
                 'Authorization', 'Bearer ' || v_clave
               ),
    body    := jsonb_build_object('tipo', v_tipo, 'id', NEW.id)
  );
  return null;
end;
$func$;

drop trigger if exists tr_avisar_correo on public.reservas;
create trigger tr_avisar_correo
  after insert or update of estado on public.reservas
  for each row execute function public.avisar_por_correo();


-- ---------- 9. DATOS INICIALES ----------
insert into public.config (clave, valor) values
  ('slot_min',             '15'),   -- tramos de cuarto de hora
  ('antelacion_min_minutos', '30'),
  ('dias_max_vista',       '60'),
  ('nombre_negocio',       'El Casino Vila-real'),
  ('telefono_negocio',     '689229479'),
  -- Se rellenan tras desplegar la función (ver RESERVAS.md). Vacío = sin correos.
  ('url_funcion_correo',   ''),
  ('clave_api_correo',     '')
on conflict (clave) do nothing;

-- Horario de reservas de El Casino:
--   Lunes cerrado · Martes, miércoles y domingo: solo comidas
--   Jueves a sábado: comidas y cenas (son los días que cierran tarde)
insert into public.franjas_horario (dia_semana, servicio, hora_inicio, hora_fin, aforo_maximo, duracion_min)
select * from (values
  (0, 'comida', time '13:00', time '15:30', 40,  90),
  (2, 'comida', time '13:00', time '15:30', 40,  90),
  (3, 'comida', time '13:00', time '15:30', 40,  90),
  (4, 'comida', time '13:00', time '15:30', 40,  90),
  (4, 'cena',   time '20:00', time '23:00', 40, 120),
  (5, 'comida', time '13:00', time '15:30', 40,  90),
  (5, 'cena',   time '20:00', time '23:00', 40, 120),
  (6, 'comida', time '13:00', time '15:30', 40,  90),
  (6, 'cena',   time '20:00', time '23:00', 40, 120)
) as v(dia_semana, servicio, hora_inicio, hora_fin, aforo_maximo, duracion_min)
where not exists (select 1 from public.franjas_horario);

-- Los 14 turnos de la semana (7 días × comidas y cenas) siempre presentes,
-- los que faltaban desactivados. Así el panel enseña la semana completa y el
-- negocio puede abrir un lunes de fiesta mayor sin llamar a nadie.
insert into public.franjas_horario
  (dia_semana, servicio, hora_inicio, hora_fin, aforo_maximo, duracion_min, activa)
select d.dia,
       s.servicio,
       case when s.servicio = 'comida' then time '13:00' else time '20:00' end,
       case when s.servicio = 'comida' then time '15:30' else time '23:00' end,
       40,
       case when s.servicio = 'comida' then 90 else 120 end,
       false
from generate_series(0, 6) as d(dia)
cross join (values ('comida'), ('cena')) as s(servicio)
on conflict (dia_semana, servicio) do nothing;

-- Valor de partida para el tope de cocina. Solo la primera vez: si el negocio
-- ya ha tocado alguno, no se pisa nada. El número real lo ajustan ellos viendo
-- cuántos primeros aguanta la cocina por cuarto de hora.
update public.franjas_horario set max_por_slot = 8
where max_por_slot is null
  and not exists (select 1 from public.franjas_horario where max_por_slot is not null);

-- Los datos iniciales de arriba no pisan lo que ya existe, así que en las
-- instalaciones antiguas slot_min se quedaría en los 30 minutos originales.
-- Solo se cambia si sigue teniendo ese valor de fábrica: si el negocio lo ha
-- puesto a otra cosa a propósito, se respeta.
update public.config set valor = '15' where clave = 'slot_min' and valor = '30';

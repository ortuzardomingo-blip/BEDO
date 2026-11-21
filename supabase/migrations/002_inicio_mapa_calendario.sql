-- =====================================================================
--  BEDO · Actualización 2: Inicio, Mapa, Diario, Calendario, Alcancía,
--  Lugares, Historia, Listas
--  Pegar completo en: Supabase → SQL Editor → New query → Run
--  (Se puede correr más de una vez sin problema)
-- =====================================================================

-- ---------- Columnas nuevas en tablas existentes ----------
alter table public.activities add column if not exists scheduled_for date;
alter table public.activities add column if not exists lat double precision;
alter table public.activities add column if not exists lng double precision;
alter table public.activities add column if not exists place_name text not null default '';

alter table public.photos add column if not exists lat double precision;
alter table public.photos add column if not exists lng double precision;
alter table public.photos add column if not exists daily_date date;
alter table public.photos add column if not exists daily_who text check (daily_who in ('a', 'b'));

-- ---------- Tablas nuevas ----------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  kind        text not null default 'otro',
  yearly      boolean not null default false,
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  target       bigint not null default 0,
  activity_id  uuid references public.activities(id) on delete set null,
  entries      jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists public.places (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'restaurante',
  lat         double precision,
  lng         double precision,
  address     text not null default '',
  rating_a    int check (rating_a between 1 and 5),
  rating_b    int check (rating_b between 1 and 5),
  note        text not null default '',
  visited_at  date,
  created_at  timestamptz not null default now()
);

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  note        text not null default '',
  photo_id    uuid references public.photos(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  list        text not null,
  title       text not null,
  note        text not null default '',
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Permisos y seguridad (solo usuarios con sesión) ----------
grant select, insert, update, delete on public.events, public.goals, public.places, public.milestones, public.items to authenticated;

alter table public.events     enable row level security;
alter table public.goals      enable row level security;
alter table public.places     enable row level security;
alter table public.milestones enable row level security;
alter table public.items      enable row level security;

drop policy if exists "auth all" on public.events;
drop policy if exists "auth all" on public.goals;
drop policy if exists "auth all" on public.places;
drop policy if exists "auth all" on public.milestones;
drop policy if exists "auth all" on public.items;

create policy "auth all" on public.events     for all to authenticated using (true) with check (true);
create policy "auth all" on public.goals      for all to authenticated using (true) with check (true);
create policy "auth all" on public.places     for all to authenticated using (true) with check (true);
create policy "auth all" on public.milestones for all to authenticated using (true) with check (true);
create policy "auth all" on public.items      for all to authenticated using (true) with check (true);

-- ---------- Tiempo real ----------
do $$
begin
  begin alter publication supabase_realtime add table public.events;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.goals;      exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.places;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.milestones; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.items;      exception when duplicate_object then null; end;
end $$;

-- Refresca el caché de la API para que vea las columnas nuevas de inmediato
notify pgrst, 'reload schema';

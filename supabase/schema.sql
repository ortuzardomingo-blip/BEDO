-- =====================================================================
--  BEDO · Esquema de base de datos para Supabase
--  Pegar completo en: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Tablas ----------
create table if not exists public.settings (
  id      int primary key default 1 check (id = 1),
  title   text not null default 'BEDO',
  name_a  text not null default '',
  name_b  text not null default '',
  since   date
);

create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  note        text not null default '',
  done        boolean not null default false,
  done_at     date,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  path         text not null,
  thumb_path   text not null,
  caption      text not null default '',
  taken_at     timestamp,               -- hora local de la foto (EXIF)
  activity_id  uuid references public.activities(id) on delete set null,
  in_frame     boolean not null default false,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);

create table if not exists public.wheels (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  icon      text not null default 'sparkles',
  options   jsonb not null default '[]'::jsonb,
  position  int not null default 0
);

create index if not exists photos_activity_idx on public.photos(activity_id);

-- ---------- Seguridad: solo usuarios con sesión iniciada ----------
alter table public.settings   enable row level security;
alter table public.activities enable row level security;
alter table public.photos     enable row level security;
alter table public.wheels     enable row level security;

drop policy if exists "auth all" on public.settings;
drop policy if exists "auth all" on public.activities;
drop policy if exists "auth all" on public.photos;
drop policy if exists "auth all" on public.wheels;

create policy "auth all" on public.settings   for all to authenticated using (true) with check (true);
create policy "auth all" on public.activities for all to authenticated using (true) with check (true);
create policy "auth all" on public.photos     for all to authenticated using (true) with check (true);
create policy "auth all" on public.wheels     for all to authenticated using (true) with check (true);

-- ---------- Almacenamiento de fotos (bucket privado) ----------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "bedo photos read"   on storage.objects;
drop policy if exists "bedo photos insert" on storage.objects;
drop policy if exists "bedo photos update" on storage.objects;
drop policy if exists "bedo photos delete" on storage.objects;

create policy "bedo photos read"   on storage.objects for select to authenticated using (bucket_id = 'photos');
create policy "bedo photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
create policy "bedo photos update" on storage.objects for update to authenticated using (bucket_id = 'photos');
create policy "bedo photos delete" on storage.objects for delete to authenticated using (bucket_id = 'photos');

-- ---------- Tiempo real: los cambios del celular aparecen en el PC al instante ----------
do $$
begin
  begin alter publication supabase_realtime add table public.settings;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.activities; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.photos;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.wheels;     exception when duplicate_object then null; end;
end $$;

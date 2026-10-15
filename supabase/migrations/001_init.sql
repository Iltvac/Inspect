-- Схема базы «Автоподбор». Уже применена к проекту Supabase car-inspect.
-- Для нового проекта: Supabase → SQL Editor → вставить файл целиком → Run.

-- Осмотры автомобилей. Чек-лист, толщина краски и фото хранятся в jsonb прямо в строке осмотра:
-- пункты чек-листа описаны в коде (src/lib/checklist.ts), и чтобы добавить пункт, базу менять не нужно.
create table inspections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users on delete cascade,
  make        text,             -- марка
  model       text,
  year        int,
  vin         text,
  plate       text,             -- госномер
  mileage     int,              -- пробег, км
  price       numeric(12,2),    -- цена продавца
  location    text,             -- где смотрели
  client_name text,             -- для кого подбор
  checks      jsonb not null default '{}'::jsonb,  -- {"body.rust": {"s": "ok|warn|bad", "n": "заметка"}}
  paint       jsonb not null default '{}'::jsonb,  -- {"hood": 120, "door_fl": 340}
  photos      jsonb not null default '[]'::jsonb,  -- [{"path": "...", "item": "body.rust"}]
  verdict     text check (verdict in ('buy', 'bargain', 'reject')),
  summary     text,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index inspections_owner_created on inspections (owner_id, created_at desc);

-- RLS: каждый видит и меняет только свои осмотры
alter table inspections enable row level security;
create policy "own rows" on inspections for all
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create or replace function touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger inspections_touch before update on inspections for each row execute function touch_updated_at();

-- Отчёт для клиента по ссылке: без входа, только по секретному токену, без owner_id.
-- security definer — намеренно: так клиент видит ровно один осмотр, а не всю таблицу.
create or replace function get_report(token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(i) - 'owner_id' - 'share_token' from public.inspections i where i.share_token = token
$$;
revoke all on function get_report(text) from public;
grant execute on function get_report(text) to anon, authenticated;

alter publication supabase_realtime add table inspections;

-- Фото: публичное чтение по прямой ссылке (пути случайные), запись только в свою папку.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
create policy "upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

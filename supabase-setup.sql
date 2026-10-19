-- Jalankan sekali di Supabase Dashboard > SQL Editor > New query.
-- Buat akun admin terlebih dahulu di Authentication > Users, lalu lihat
-- UUID pengguna dan jalankan perintah INSERT yang ada di bagian paling bawah.

create table if not exists public.hmss_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.leadership_periods (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  start_year integer not null check (start_year between 1900 and 2200),
  end_year integer,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint leadership_period_years_check
    check (end_year is null or end_year between start_year and 2200)
);

create unique index if not exists leadership_periods_one_active
  on public.leadership_periods (is_active)
  where is_active = true;

create or replace function public.set_only_one_active_leadership_period()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_active then
    update public.leadership_periods
    set is_active = false
    where is_active = true and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists leadership_periods_single_active on public.leadership_periods;
create trigger leadership_periods_single_active
  before insert or update of is_active on public.leadership_periods
  for each row execute function public.set_only_one_active_leadership_period();

create table if not exists public.leadership_positions (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.leadership_periods (id) on delete cascade,
  position_title text not null check (char_length(position_title) between 1 and 100),
  full_name text not null check (char_length(full_name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 300),
  photo_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_positions_period_order
  on public.leadership_positions (period_id, sort_order, position_title);

create or replace function public.is_hmss_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.hmss_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_hmss_admin() from public;
grant execute on function public.is_hmss_admin() to authenticated;

alter table public.hmss_admins enable row level security;
alter table public.leadership_periods enable row level security;
alter table public.leadership_positions enable row level security;

drop policy if exists "Public can read leadership periods" on public.leadership_periods;
create policy "Public can read leadership periods"
  on public.leadership_periods for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage leadership periods" on public.leadership_periods;
create policy "Admins manage leadership periods"
  on public.leadership_periods for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

drop policy if exists "Public can read leadership positions" on public.leadership_positions;
create policy "Public can read leadership positions"
  on public.leadership_positions for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage leadership positions" on public.leadership_positions;
create policy "Admins manage leadership positions"
  on public.leadership_positions for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

grant select on public.leadership_periods, public.leadership_positions to anon, authenticated;
grant insert, update, delete on public.leadership_periods, public.leadership_positions to authenticated;
revoke all on public.hmss_admins from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hmss-organization',
  'hmss-organization',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view leadership photos" on storage.objects;
create policy "Public can view leadership photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'hmss-organization');

drop policy if exists "Admins upload leadership photos" on storage.objects;
create policy "Admins upload leadership photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'hmss-organization'
    and (select public.is_hmss_admin())
  );

drop policy if exists "Admins update leadership photos" on storage.objects;
create policy "Admins update leadership photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'hmss-organization'
    and (select public.is_hmss_admin())
  )
  with check (
    bucket_id = 'hmss-organization'
    and (select public.is_hmss_admin())
  );

drop policy if exists "Admins delete leadership photos" on storage.objects;
create policy "Admins delete leadership photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'hmss-organization'
    and (select public.is_hmss_admin())
  );

-- Ganti UUID_DI_SINI dengan UUID akun admin dari Authentication > Users,
-- lalu jalankan baris ini satu kali setelah skrip di atas berhasil:
-- insert into public.hmss_admins (user_id) values ('UUID_DI_SINI');

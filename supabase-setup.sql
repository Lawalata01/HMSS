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

create table if not exists public.hmss_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  category text not null default 'Informasi' check (char_length(category) <= 80),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  content text not null default '' check (char_length(content) <= 20000),
  image_url text not null default '' check (char_length(image_url) <= 2048),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hmss_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'Rencana' check (status in ('Rencana', 'Berjalan', 'Selesai')),
  start_date date,
  end_date date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hmss_program_dates_check
    check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.hmss_gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  category text not null default 'Kegiatan' check (char_length(category) <= 80),
  image_url text not null check (char_length(image_url) between 1 and 2048),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hmss_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 100),
  university text not null default '' check (char_length(university) <= 150),
  study_program text not null default '' check (char_length(study_program) <= 150),
  cohort integer check (cohort is null or cohort between 1900 and 2200),
  whatsapp text not null default '' check (char_length(whatsapp) <= 30),
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'Menunggu' check (status in ('Menunggu', 'Diterima', 'Ditolak')),
  created_at timestamptz not null default now()
);

create table if not exists public.hmss_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null default '' check (char_length(email) <= 254),
  subject text not null default '' check (char_length(subject) <= 180),
  message text not null check (char_length(message) between 1 and 3000),
  status text not null default 'Baru' check (status in ('Baru', 'Ditindaklanjuti')),
  created_at timestamptz not null default now()
);

create table if not exists public.hmss_site_settings (
  id boolean primary key default true check (id),
  organization_name text not null default 'Himpunan Mahasiswa Sorong Selatan',
  description text not null default '',
  domicile text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.hmss_site_settings (id)
values (true)
on conflict (id) do nothing;

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
alter table public.hmss_news enable row level security;
alter table public.hmss_programs enable row level security;
alter table public.hmss_gallery enable row level security;
alter table public.hmss_members enable row level security;
alter table public.hmss_messages enable row level security;
alter table public.hmss_site_settings enable row level security;

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

drop policy if exists "Public can read published HMSS news" on public.hmss_news;
create policy "Public can read published HMSS news"
  on public.hmss_news for select to anon, authenticated
  using (published);
drop policy if exists "Admins manage HMSS news" on public.hmss_news;
create policy "Admins manage HMSS news"
  on public.hmss_news for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

drop policy if exists "Public can read published HMSS programs" on public.hmss_programs;
create policy "Public can read published HMSS programs"
  on public.hmss_programs for select to anon, authenticated
  using (published);
drop policy if exists "Admins manage HMSS programs" on public.hmss_programs;
create policy "Admins manage HMSS programs"
  on public.hmss_programs for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

drop policy if exists "Public can read published HMSS gallery" on public.hmss_gallery;
create policy "Public can read published HMSS gallery"
  on public.hmss_gallery for select to anon, authenticated
  using (published);
drop policy if exists "Admins manage HMSS gallery" on public.hmss_gallery;
create policy "Admins manage HMSS gallery"
  on public.hmss_gallery for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

drop policy if exists "Public can submit HMSS membership" on public.hmss_members;
create policy "Public can submit HMSS membership"
  on public.hmss_members for insert to anon, authenticated
  with check (status = 'Menunggu');
drop policy if exists "Admins manage HMSS members" on public.hmss_members;
create policy "Admins manage HMSS members"
  on public.hmss_members for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

drop policy if exists "Public can submit HMSS messages" on public.hmss_messages;
create policy "Public can submit HMSS messages"
  on public.hmss_messages for insert to anon, authenticated
  with check (status = 'Baru');
drop policy if exists "Admins manage HMSS messages" on public.hmss_messages;
create policy "Admins manage HMSS messages"
  on public.hmss_messages for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

drop policy if exists "Public can read HMSS site settings" on public.hmss_site_settings;
create policy "Public can read HMSS site settings"
  on public.hmss_site_settings for select to anon, authenticated
  using (id);
drop policy if exists "Admins manage HMSS site settings" on public.hmss_site_settings;
create policy "Admins manage HMSS site settings"
  on public.hmss_site_settings for all to authenticated
  using ((select public.is_hmss_admin()))
  with check ((select public.is_hmss_admin()));

grant select on public.hmss_news, public.hmss_programs, public.hmss_gallery, public.hmss_site_settings to anon, authenticated;
grant insert on public.hmss_members, public.hmss_messages to anon, authenticated;
grant select, insert, update, delete on public.hmss_news, public.hmss_programs, public.hmss_gallery,
  public.hmss_members, public.hmss_messages, public.hmss_site_settings to authenticated;

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

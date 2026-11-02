-- Run once in your own Supabase project's SQL Editor.
create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.portfolio_admins enable row level security;
-- No client-side policies: owners are assigned only through the dashboard/SQL.
create or replace function public.is_portfolio_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.portfolio_admins where user_id = auth.uid()); $$;
revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;
create table if not exists public.portfolio_content (
  id smallint primary key check (id = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision uuid not null default gen_random_uuid()
);
alter table public.portfolio_content enable row level security;
drop policy if exists "Public portfolio read" on public.portfolio_content;
create policy "Public portfolio read" on public.portfolio_content for select to anon, authenticated using (true);
drop policy if exists "Owner portfolio insert" on public.portfolio_content;
create policy "Owner portfolio insert" on public.portfolio_content for insert to authenticated with check (public.is_portfolio_admin());
drop policy if exists "Owner portfolio update" on public.portfolio_content;
create policy "Owner portfolio update" on public.portfolio_content for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
grant select on public.portfolio_content to anon, authenticated;
grant insert, update on public.portfolio_content to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-media','portfolio-media',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Portfolio media read" on storage.objects;
create policy "Portfolio media read" on storage.objects for select to anon, authenticated using (bucket_id='portfolio-media');
drop policy if exists "Owner media upload" on storage.objects;
create policy "Owner media upload" on storage.objects for insert to authenticated with check (bucket_id='portfolio-media' and public.is_portfolio_admin());
-- Owner setup: first create a user in Authentication > Users > Add user.
-- Replace YOUR_OWNER_EMAIL below, then run this final statement separately:
-- insert into public.portfolio_admins(user_id)
-- select id from auth.users where email = 'YOUR_OWNER_EMAIL'
-- on conflict do nothing;

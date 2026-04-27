create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  days integer not null,
  used_by uuid references public.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.promo_codes enable row level security;

create policy "Authenticated users can read promo codes"
  on public.promo_codes for select
  using (auth.uid() is not null);

create policy "Admin can create promo codes"
  on public.promo_codes for insert
  with check ((select email from public.users where id = auth.uid()) = 'andyyan0806@gmail.com');

create policy "Authenticated users can claim unused codes"
  on public.promo_codes for update
  using (auth.uid() is not null and used_by is null);

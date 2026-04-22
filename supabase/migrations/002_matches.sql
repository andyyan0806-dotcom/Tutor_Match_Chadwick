-- Matches table
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  tutor_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'paid')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 days'),
  activated_at timestamptz,
  unique (student_id, tutor_id)
);

-- Extension requests table
create table public.extension_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index on public.matches (student_id);
create index on public.matches (tutor_id);
create index on public.matches (status);
create index on public.extension_requests (match_id);

alter table public.matches enable row level security;
alter table public.extension_requests enable row level security;

-- Matches RLS
create policy "Users can view their own matches"
  on public.matches for select
  using (
    auth.uid() = student_id
    or auth.uid() = tutor_id
    or (select email from public.users where id = auth.uid()) = 'andyyan0806@gmail.com'
  );

create policy "Users can create matches they are part of"
  on public.matches for insert
  with check (auth.uid() = student_id or auth.uid() = tutor_id);

create policy "Users can update their own matches"
  on public.matches for update
  using (
    auth.uid() = student_id
    or auth.uid() = tutor_id
    or (select email from public.users where id = auth.uid()) = 'andyyan0806@gmail.com'
  );

-- Extension requests RLS
create policy "Users can view extension requests for their matches"
  on public.extension_requests for select
  using (
    auth.uid() = requested_by
    or exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.student_id = auth.uid() or m.tutor_id = auth.uid())
    )
    or (select email from public.users where id = auth.uid()) = 'andyyan0806@gmail.com'
  );

create policy "Users can create extension requests for their matches"
  on public.extension_requests for insert
  with check (
    auth.uid() = requested_by
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.student_id = auth.uid() or m.tutor_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.matches;

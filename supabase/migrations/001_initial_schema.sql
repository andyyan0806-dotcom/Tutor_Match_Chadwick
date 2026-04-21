-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  grade text not null,
  role text not null check (role in ('tutor', 'student')),
  created_at timestamptz default now()
);

-- Tutor profiles
create table public.tutor_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  university text,
  uni_grade text,
  ib_scores text,
  subjects text[] not null default '{}',
  bio text not null default '',
  is_active boolean not null default false,
  updated_at timestamptz default now()
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  timestamp timestamptz not null default now(),
  read_status boolean not null default false
);

-- Reviews (one per student-tutor pair)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  tutor_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (student_id, tutor_id)
);

-- Indexes
create index on public.tutor_profiles (is_active);
create index on public.messages (sender_id, receiver_id);
create index on public.messages (receiver_id, read_status);
create index on public.reviews (tutor_id);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

-- RLS Policies: users
create policy "Users can read all profiles"
  on public.users for select using (true);

create policy "Users can insert their own row"
  on public.users for insert with check (auth.uid() = id);

create policy "Users can update their own row"
  on public.users for update using (auth.uid() = id);

-- RLS Policies: tutor_profiles
create policy "Anyone can view active tutor profiles"
  on public.tutor_profiles for select using (true);

create policy "Tutors can manage their own profile"
  on public.tutor_profiles for all using (auth.uid() = user_id);

-- RLS Policies: messages
create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can mark messages read"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- RLS Policies: reviews
create policy "Anyone can view reviews"
  on public.reviews for select using (true);

create policy "Students can submit one review per tutor"
  on public.reviews for insert
  with check (auth.uid() = student_id);

-- Enable Realtime for messages
alter publication supabase_realtime add table public.messages;

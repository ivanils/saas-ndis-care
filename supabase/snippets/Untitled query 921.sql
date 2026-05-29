create table if not exists worker_participants (
  worker_id uuid references public.profiles(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete cascade,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (worker_id, participant_id)
);
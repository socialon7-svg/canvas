create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null default '',
  program_code text not null unique,
  start_date date,
  end_date date,
  status text not null default 'active',
  brief text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_status_check check (status in ('draft', 'active', 'closed', 'archived'))
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  participant_code text not null,
  join_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  name text not null,
  email text not null default '',
  phone text not null default '',
  school text not null default '',
  major text not null default '',
  role text not null default 'participant',
  joined_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, participant_code)
);

create table if not exists public.program_modules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  module_id int not null,
  module_slug text not null,
  is_enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(program_id, module_slug)
);

create table if not exists public.participant_module_progress (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  module_slug text not null,
  status text not null default 'not_started',
  current_step int not null default 0,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  admin_comment text not null default '',
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(program_id, participant_id, module_slug),
  constraint participant_module_progress_status_check check (
    status in ('not_started', 'in_progress', 'completed', 'needs_review', 'returned')
  )
);

create table if not exists public.module_drafts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  module_slug text not null,
  draft_data jsonb not null default '{}'::jsonb,
  current_step int not null default 0,
  saved_at timestamptz not null default now(),
  unique(program_id, participant_id, module_slug)
);

create table if not exists public.module_submissions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  module_slug text not null,
  title text not null default '',
  status text not null default 'submitted',
  pdf_status text not null default 'idle',
  pdf_error_message text,
  pdf_generated_at timestamptz,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint module_submissions_status_check check (status in ('draft', 'submitted', 'reviewed', 'returned')),
  constraint module_submissions_pdf_status_check check (pdf_status in ('idle', 'generating', 'success', 'failed'))
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  submission_id uuid,
  module_slug text,
  status text not null default 'needs_revision',
  comment text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedbacks_status_check check (status in ('needs_revision', 'good', 'excellent', 'published', 'archived'))
);

create index if not exists idx_teams_program_id on public.teams(program_id);
create index if not exists idx_participants_program_id on public.participants(program_id);
create index if not exists idx_participants_join_token on public.participants(join_token);
create index if not exists idx_program_modules_program_id on public.program_modules(program_id);
create index if not exists idx_module_submissions_program_module_submitted
  on public.module_submissions(program_id, module_slug, submitted_at desc);
create index if not exists idx_participant_module_progress_lookup
  on public.participant_module_progress(program_id, participant_id, module_slug);
create index if not exists idx_module_drafts_lookup
  on public.module_drafts(program_id, participant_id, module_slug);
create index if not exists idx_feedbacks_program_participant
  on public.feedbacks(program_id, participant_id);

drop trigger if exists set_programs_updated_at on public.programs;
create trigger set_programs_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_participants_updated_at on public.participants;
create trigger set_participants_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

drop trigger if exists set_module_submissions_updated_at on public.module_submissions;
create trigger set_module_submissions_updated_at
before update on public.module_submissions
for each row execute function public.set_updated_at();

drop trigger if exists set_feedbacks_updated_at on public.feedbacks;
create trigger set_feedbacks_updated_at
before update on public.feedbacks
for each row execute function public.set_updated_at();

alter table public.programs enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.program_modules enable row level security;
alter table public.participant_module_progress enable row level security;
alter table public.module_drafts enable row level security;
alter table public.module_submissions enable row level security;
alter table public.feedbacks enable row level security;

create table if not exists modu_startup_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  input jsonb not null,
  draft jsonb not null
);

create index if not exists idx_modu_startup_submissions_created_at
on modu_startup_submissions (created_at desc);

create index if not exists idx_modu_startup_submissions_program
on modu_startup_submissions ((input->>'programName'));

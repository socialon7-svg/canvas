create table if not exists lean_canvas_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant jsonb not null,
  canvas jsonb not null
);

create index if not exists idx_lean_canvas_submissions_created_at
on lean_canvas_submissions (created_at desc);

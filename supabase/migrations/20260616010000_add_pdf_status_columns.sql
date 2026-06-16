alter table if exists public.lean_canvas_submissions
  add column if not exists pdf_status text not null default 'idle',
  add column if not exists pdf_error_message text,
  add column if not exists pdf_generated_at timestamptz;

alter table if exists public.modu_startup_submissions
  add column if not exists pdf_status text not null default 'idle',
  add column if not exists pdf_error_message text,
  add column if not exists pdf_generated_at timestamptz;

alter table if exists public.module_submissions
  add column if not exists pdf_generated_at timestamptz;

do $$
begin
  if to_regclass('public.lean_canvas_submissions') is not null
    and not exists (
      select 1 from pg_constraint where conname = 'lean_canvas_submissions_pdf_status_check'
    )
  then
    alter table public.lean_canvas_submissions
      add constraint lean_canvas_submissions_pdf_status_check
      check (pdf_status in ('idle', 'generating', 'success', 'failed'));
  end if;

  if to_regclass('public.modu_startup_submissions') is not null
    and not exists (
      select 1 from pg_constraint where conname = 'modu_startup_submissions_pdf_status_check'
    )
  then
    alter table public.modu_startup_submissions
      add constraint modu_startup_submissions_pdf_status_check
      check (pdf_status in ('idle', 'generating', 'success', 'failed'));
  end if;
end $$;

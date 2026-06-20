alter table public.participants
  add column if not exists join_token_expires_at timestamptz,
  add column if not exists join_token_revoked_at timestamptz,
  add column if not exists is_active boolean not null default true;

update public.participants
set join_token_expires_at = coalesce(created_at, now()) + interval '180 days'
where join_token_expires_at is null;

alter table public.participants
  alter column join_token_expires_at set default (now() + interval '180 days'),
  alter column join_token_expires_at set not null;

create index if not exists idx_participants_active_join_token
  on public.participants(join_token)
  where is_active = true and join_token_revoked_at is null;

-- Keep legacy rows readable, but move every row with operations context into the
-- common submission source. Reusing the legacy id preserves existing preview URLs.
do $$
begin
  if to_regclass('public.lean_canvas_submissions') is not null then
    execute $sql$
      insert into public.module_submissions (
        id,
        program_id,
        participant_id,
        team_id,
        module_slug,
        title,
        status,
        pdf_status,
        pdf_error_message,
        pdf_generated_at,
        input_data,
        output_data,
        submitted_at,
        created_at,
        updated_at
      )
      select
        legacy.id,
        participant_row.program_id,
        participant_row.id,
        participant_row.team_id,
        'lean-canvas',
        coalesce(nullif(legacy.participant->>'ideaName', ''), 'Lean Canvas submission'),
        'submitted',
        case
          when legacy.pdf_status in ('idle', 'generating', 'success', 'failed') then legacy.pdf_status
          else 'idle'
        end,
        legacy.pdf_error_message,
        legacy.pdf_generated_at,
        jsonb_build_object(
          'participant', legacy.participant,
          'legacySource', 'lean_canvas_submissions',
          'sourceSubmissionId', legacy.id
        ),
        jsonb_build_object('canvas', legacy.canvas),
        legacy.created_at,
        legacy.created_at,
        legacy.created_at
      from public.lean_canvas_submissions as legacy
      join public.participants as participant_row
        on participant_row.id::text = legacy.participant->'operation'->>'participantId'
      on conflict (id) do nothing
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.modu_startup_submissions') is not null then
    execute $sql$
      insert into public.module_submissions (
        id,
        program_id,
        participant_id,
        team_id,
        module_slug,
        title,
        status,
        pdf_status,
        pdf_error_message,
        pdf_generated_at,
        input_data,
        output_data,
        submitted_at,
        created_at,
        updated_at
      )
      select
        legacy.id,
        participant_row.program_id,
        participant_row.id,
        participant_row.team_id,
        'modu-startup-application',
        coalesce(nullif(legacy.input->>'ideaTitle', ''), 'Startup application submission'),
        'submitted',
        case
          when legacy.pdf_status in ('idle', 'generating', 'success', 'failed') then legacy.pdf_status
          else 'idle'
        end,
        legacy.pdf_error_message,
        legacy.pdf_generated_at,
        jsonb_build_object(
          'input', legacy.input,
          'legacySource', 'modu_startup_submissions',
          'sourceSubmissionId', legacy.id
        ),
        jsonb_build_object('draft', legacy.draft),
        legacy.created_at,
        legacy.created_at,
        legacy.created_at
      from public.modu_startup_submissions as legacy
      join public.participants as participant_row
        on participant_row.id::text = legacy.input->'operation'->>'participantId'
      on conflict (id) do nothing
    $sql$;
  end if;
end
$$;

-- Earlier releases mirrored legacy submissions with a new module_submissions id.
-- The canonical migration reuses the legacy id to preserve existing preview URLs.
-- Move feedback references to that canonical id before removing duplicate mirrors.
with duplicate_map as (
  select
    mirrored.id as duplicate_id,
    canonical.id as canonical_id
  from public.module_submissions as mirrored
  join public.module_submissions as canonical
    on canonical.id::text = mirrored.input_data->>'sourceSubmissionId'
  where mirrored.id <> canonical.id
    and mirrored.input_data->>'source' in ('lean_canvas_submissions', 'modu_startup_submissions')
)
update public.feedbacks as feedback
set submission_id = duplicate_map.canonical_id,
    updated_at = now()
from duplicate_map
where feedback.submission_id = duplicate_map.duplicate_id;

with duplicate_map as (
  select mirrored.id as duplicate_id
  from public.module_submissions as mirrored
  join public.module_submissions as canonical
    on canonical.id::text = mirrored.input_data->>'sourceSubmissionId'
  where mirrored.id <> canonical.id
    and mirrored.input_data->>'source' in ('lean_canvas_submissions', 'modu_startup_submissions')
)
delete from public.module_submissions as submission
using duplicate_map
where submission.id = duplicate_map.duplicate_id;

create unique index if not exists idx_module_submissions_progress_source
  on public.module_submissions ((input_data ->> 'sourceProgressId'))
  where input_data ->> 'source' = 'participant_module_progress'
    and coalesce(input_data ->> 'sourceProgressId', '') <> '';

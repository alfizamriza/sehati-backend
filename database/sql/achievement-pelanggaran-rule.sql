alter table public.achievement
  add column if not exists pelanggaran_mode text null
    check (pelanggaran_mode in ('count', 'no_violation_days'));

alter table public.achievement
  add column if not exists pelanggaran_period_days integer null;

update public.achievement
set pelanggaran_mode = coalesce(pelanggaran_mode, 'count')
where tipe = 'pelanggaran';

update public.achievement
set pelanggaran_period_days = null
where tipe <> 'pelanggaran';

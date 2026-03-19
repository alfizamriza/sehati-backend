create table if not exists public.achievement_showcase_note (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique references public.siswa (nis) on delete cascade,
  achievement_id bigint not null references public.achievement (id) on delete cascade,
  note_text text null,
  is_active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.achievement_showcase_note
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');

update public.achievement_showcase_note
set expires_at = coalesce(expires_at, created_at + interval '24 hours', now() + interval '24 hours')
where expires_at is null;

create index if not exists idx_achievement_showcase_note_achievement_id
  on public.achievement_showcase_note (achievement_id);

create index if not exists idx_achievement_showcase_note_expires_at
  on public.achievement_showcase_note (expires_at);

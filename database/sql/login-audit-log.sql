create table if not exists public.login_audit_log (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'guru', 'siswa', 'kantin')),
  actor_user_id text null,
  actor_identifier text not null,
  actor_name text null,
  status text not null check (status in ('success', 'failed')),
  failure_reason text null,
  ip_address text null,
  user_agent text null,
  login_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_login_audit_log_login_at
  on public.login_audit_log (login_at desc);

create index if not exists idx_login_audit_log_role
  on public.login_audit_log (role);

create index if not exists idx_login_audit_log_actor_identifier
  on public.login_audit_log (actor_identifier);

create index if not exists idx_siswa_is_active_coins
  on public.siswa (is_active, coins desc);

create index if not exists idx_siswa_is_active_kelas
  on public.siswa (is_active, kelas_id);

create index if not exists idx_guru_is_active
  on public.guru (is_active);

create index if not exists idx_absensi_tumbler_tanggal
  on public.absensi_tumbler (tanggal);

create index if not exists idx_absensi_tumbler_nis_tanggal
  on public.absensi_tumbler (nis, tanggal);

create index if not exists idx_transaksi_kantin_created_at
  on public.transaksi (kantin_id, created_at desc);

create index if not exists idx_transaksi_kantin_status_pembayaran
  on public.transaksi (kantin_id, status_pembayaran);

create index if not exists idx_detail_transaksi_transaksi_id
  on public.detail_transaksi (transaksi_id);

create index if not exists idx_pelanggaran_nis_status_tanggal
  on public.pelanggaran (nis, status, tanggal);

create index if not exists idx_tanggal_libur_is_active_tanggal
  on public.tanggal_libur (is_active, tanggal);

create or replace function public.get_admin_dashboard_stats()
returns table (
  total_siswa bigint,
  total_siswa_aktif bigint,
  total_guru bigint,
  total_guru_aktif bigint,
  total_kelas bigint,
  total_voucher bigint,
  voucher_diklaim bigint,
  total_coins bigint
)
language sql
stable
as $$
  select
    (select count(*) from public.siswa) as total_siswa,
    (select count(*) from public.siswa where is_active = true) as total_siswa_aktif,
    (select count(*) from public.guru) as total_guru,
    (select count(*) from public.guru where is_active = true) as total_guru_aktif,
    (select count(*) from public.kelas) as total_kelas,
    (select count(*) from public.voucher) as total_voucher,
    (select count(*) from public.voucher where status = 'used') as voucher_diklaim,
    (select coalesce(sum(coins), 0) from public.siswa) as total_coins;
$$;

create or replace function public.get_dashboard_absensi_counts(
  p_start_date date,
  p_end_date date
)
returns table (
  tanggal date,
  total bigint
)
language sql
stable
as $$
  select
    a.tanggal::date as tanggal,
    count(*)::bigint as total
  from public.absensi_tumbler a
  where a.tanggal >= p_start_date
    and a.tanggal <= p_end_date
  group by a.tanggal::date
  order by a.tanggal::date asc;
$$;

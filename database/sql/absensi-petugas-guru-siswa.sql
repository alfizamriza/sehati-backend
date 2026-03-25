-- Model pencatat absensi:
-- guru  -> kolom `nip`
-- siswa -> kolom `siswa_nis`
-- tepat satu kolom harus terisi

ALTER TABLE public.absensi_tumbler
  ALTER COLUMN nip DROP NOT NULL;

ALTER TABLE public.absensi_tumbler
  ADD COLUMN IF NOT EXISTS siswa_nis TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'absensi_tumbler_siswa_nis_fkey'
  ) THEN
    ALTER TABLE public.absensi_tumbler
      ADD CONSTRAINT absensi_tumbler_siswa_nis_fkey
      FOREIGN KEY (siswa_nis)
      REFERENCES public.siswa(nis)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_absensi_tumbler_siswa_nis
  ON public.absensi_tumbler (siswa_nis);

ALTER TABLE public.absensi_tumbler
  DROP CONSTRAINT IF EXISTS absensi_tumbler_petugas_check;

ALTER TABLE public.absensi_tumbler
  ADD CONSTRAINT absensi_tumbler_petugas_check
  CHECK (num_nonnulls(nip, siswa_nis) = 1);

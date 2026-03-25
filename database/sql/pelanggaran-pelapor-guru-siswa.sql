-- Model pelapor pelanggaran:
-- guru  -> kolom `nip`
-- siswa -> kolom `siswa_nis`
-- tepat satu kolom pelapor harus terisi

ALTER TABLE public.pelanggaran
  ALTER COLUMN nip DROP NOT NULL;

ALTER TABLE public.pelanggaran
  ADD COLUMN IF NOT EXISTS siswa_nis TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pelanggaran_siswa_nis_fkey'
  ) THEN
    ALTER TABLE public.pelanggaran
      ADD CONSTRAINT pelanggaran_siswa_nis_fkey
      FOREIGN KEY (siswa_nis)
      REFERENCES public.siswa(nis)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pelanggaran_siswa_nis
  ON public.pelanggaran (siswa_nis);

ALTER TABLE public.pelanggaran
  DROP CONSTRAINT IF EXISTS pelanggaran_pelapor_check;

ALTER TABLE public.pelanggaran
  ADD CONSTRAINT pelanggaran_pelapor_check
  CHECK (num_nonnulls(nip, siswa_nis) = 1);

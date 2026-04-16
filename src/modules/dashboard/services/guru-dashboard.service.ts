import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { RequestCache } from 'src/common/utils/request-cache';

@Injectable()
export class GuruDashboardService {
  private static readonly PROFILE_CACHE_TTL_MS = 30_000;
  private static readonly PROFILE_STALE_TTL_MS = 120_000;

  constructor(private supabaseService: SupabaseService) { }

  // =====================================================
  // ROMAN NUMERAL CONVERTER
  // =====================================================
  private convertToRomanNumeral(num: number): string {
    const romanNumerals = [
      { value: 12, numeral: 'XII' },
      { value: 11, numeral: 'XI' },
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 8, numeral: 'VIII' },
      { value: 7, numeral: 'VII' },
      { value: 6, numeral: 'VI' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 3, numeral: 'III' },
      { value: 2, numeral: 'II' },
      { value: 1, numeral: 'I' },
    ];

    let result = '';
    let remaining = num;

    for (const { value, numeral } of romanNumerals) {
      while (remaining >= value) {
        result += numeral;
        remaining -= value;
      }
    }

    return result || String(num);
  }

  /**
   * Tanggal hari ini dalam WIB (UTC+7), format YYYY-MM-DD.
   */
  private getTodayString(): string {
    return new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  }

  /**
   * Timestamp sekarang dalam WIB (UTC+7).
   * Gunakan ini sebagai pengganti new Date().toISOString() agar
   * kolom verified_at / created_at / updated_at tersimpan dengan
   * waktu WIB yang benar, bukan UTC.
   */
  private nowWIB(): string {
    return new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace('Z', '+07:00');
  }

  // =====================================================
  // GET PROFIL GURU
  // =====================================================
  async getProfilGuru(nip: string) {
    return RequestCache.getOrSet(
      `dashboard:guru:profil:${nip}`,
      GuruDashboardService.PROFILE_CACHE_TTL_MS,
      async () => {
        const supabase = this.supabaseService.getClient();

        const { data: guru, error } = await supabase
          .from('guru')
          .select(`
            nip, nama, mata_pelajaran, peran, is_active,
            kelas_wali:kelas_wali_id (id, nama, tingkat, jenjang)
          `)
          .eq('nip', nip)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !guru) throw new BadRequestException('Data guru tidak ditemukan');

        const kelasWali = Array.isArray(guru.kelas_wali) ? guru.kelas_wali[0] : guru.kelas_wali;
        const tingkatRoman = kelasWali ? this.convertToRomanNumeral(kelasWali.tingkat) : '';

        return {
          success: true,
          data: {
            nip: guru.nip,
            nama: guru.nama,
            mataPelajaran: guru.mata_pelajaran,
            peran: guru.peran,
            isKonselor: guru.peran === 'konselor',
            isWaliKelas: guru.peran === 'wali_kelas',
            kelasWali: kelasWali
              ? {
                  id: kelasWali.id,
                  nama: kelasWali.nama,
                  tingkat: tingkatRoman,
                  jenjang: kelasWali.jenjang,
                  label: `${tingkatRoman} ${kelasWali.nama}`,
                }
              : null,
          },
        };
      },
      {
        staleTtlMs: GuruDashboardService.PROFILE_STALE_TTL_MS,
        onError: (error) => {
          console.warn('[GuruDashboardService] Falling back to stale profile cache:', error);
        },
      },
    );
  }

  // =====================================================
  // GET DAFTAR KELAS
  // =====================================================
  async getKelasList() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('kelas')
      .select('id, nama, tingkat, jenjang')
      .order('tingkat', { ascending: true })
      .order('nama', { ascending: true });

    if (error) throw new BadRequestException('Gagal mengambil daftar kelas');
    return { success: true, data: data || [] };
  }

  // =====================================================
  // GET STATISTIK KELAS
  // =====================================================
  async getStatistikKelas(kelasId: number) {
    const supabase = this.supabaseService.getClient();
    const today = this.getTodayString();

    const { count: totalSiswa } = await supabase
      .from('siswa')
      .select('nis', { count: 'exact', head: true })
      .eq('kelas_id', kelasId)
      .eq('is_active', true);

    if (!totalSiswa) {
      return {
        success: true,
        data: { totalSiswa: 0, hadirHariIni: 0, persentaseHadir: 0, rataRataCoins: 0, rataRataStreak: 0 },
      };
    }

    const { data: siswas } = await supabase
      .from('siswa')
      .select('nis, coins, streak')
      .eq('kelas_id', kelasId)
      .eq('is_active', true);

    const nisList = (siswas || []).map((s) => s.nis);

    const { count: hadirHariIni } = await supabase
      .from('absensi_tumbler')
      .select('nis', { count: 'exact', head: true })
      .in('nis', nisList)
      .eq('tanggal', today);

    const totalCoins = (siswas || []).reduce((sum, s) => sum + (s.coins || 0), 0);
    const totalStreak = (siswas || []).reduce((sum, s) => sum + (s.streak || 0), 0);
    const rataRataCoins = Math.round(totalCoins / totalSiswa);
    const rataRataStreak = Math.round((totalStreak / totalSiswa) * 10) / 10;
    const persentaseHadir = Math.round(((hadirHariIni || 0) / totalSiswa) * 100);

    return {
      success: true,
      data: { totalSiswa, hadirHariIni: hadirHariIni || 0, persentaseHadir, rataRataCoins, rataRataStreak, tanggal: today },
    };
  }

  // =====================================================
  // GET TOP SISWA PER KELAS
  // =====================================================
  async getTopSiswa(kelasId: number, limit = 5) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('siswa')
      .select('nis, nama, coins, streak')
      .eq('kelas_id', kelasId)
      .eq('is_active', true)
      .order('coins', { ascending: false })
      .order('streak', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException('Gagal mengambil data siswa');

    return {
      success: true,
      data: (data || []).map((s, i) => ({
        rank: i + 1,
        nis: s.nis,
        nama: s.nama,
        coins: s.coins || 0,
        streak: s.streak || 0,
        medal: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'none',
      })),
    };
  }

  // =====================================================
  // GET RIWAYAT PELANGGARAN TERBARU
  // =====================================================
  async getRiwayatPelanggaran(kelasId?: number, limit = 5) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('pelanggaran')
      .select(`
        id, status, created_at, coins_penalty,
        siswa:nis (nis, nama, kelas:kelas_id (nama, tingkat))
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(`Gagal mengambil riwayat pelanggaran: ${error.message}`);

    let result = (data || []).map((p) => {
      const siswa = Array.isArray(p.siswa) ? p.siswa[0] : p.siswa;
      const kelas = siswa?.kelas ? (Array.isArray(siswa.kelas) ? siswa.kelas[0] : siswa.kelas) : null;
      const tingkatRoman = kelas ? this.convertToRomanNumeral(kelas.tingkat) : '';
      const penalty = Math.abs(p.coins_penalty || 0);
      return {
        id: p.id,
        tanggal: p.created_at?.split('T')[0] ?? '-',
        status: p.status,
        siswa: { nama: siswa?.nama, kelasLabel: kelas ? `${tingkatRoman} ${kelas.nama}` : '—' },
        pelanggaran: { nama: 'Pelanggaran', kategori: 'sedang', bobotCoins: penalty },
      };
    });

    if (kelasId) {
      result = result.filter(() => true);
    }

    return { success: true, data: result };
  }

  // =====================================================
  // KONSELOR: GET SEMUA RIWAYAT PELANGGARAN
  // =====================================================
  async getSemuaRiwayatPelanggaran(limit = 200) {
    const supabase = this.supabaseService.getClient();
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 200;

    const { data, error } = await supabase
      .from('pelanggaran')
      .select(`
        id, status, created_at, coins_penalty, bukti_foto_url,
        siswa:nis (nis, nama, kelas:kelas_id (nama, tingkat)),
        jenis_pelanggaran:jenis_pelanggaran_id (id, nama, kategori, bobot_coins),
        guru:nip (nip, nama)
      `)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) throw new BadRequestException(`Gagal mengambil riwayat pelanggaran konselor: ${error.message}`);

    const result = (data || []).map((p) => {
      const siswa = Array.isArray(p.siswa) ? p.siswa[0] : p.siswa;
      const kelas = siswa?.kelas ? (Array.isArray(siswa.kelas) ? siswa.kelas[0] : siswa.kelas) : null;
      const tingkatRoman = kelas ? this.convertToRomanNumeral(kelas.tingkat) : '';
      const jenisPelanggaran = Array.isArray(p.jenis_pelanggaran) ? p.jenis_pelanggaran[0] : p.jenis_pelanggaran;
      const guru = Array.isArray(p.guru) ? p.guru[0] : p.guru;

      return {
        id: p.id,
        tanggal: p.created_at?.split('T')[0] ?? '-',
        status: p.status ?? 'pending',
        siswa: {
          nis: siswa?.nis ?? '-',
          nama: siswa?.nama ?? '-',
          kelasLabel: kelas ? `${tingkatRoman} ${kelas.nama}` : '-',
        },
        jenisPelanggaran: {
          id: jenisPelanggaran?.id ?? null,
          nama: jenisPelanggaran?.nama ?? '-',
          kategori: jenisPelanggaran?.kategori ?? 'sedang',
        },
        guru: { nip: guru?.nip ?? '-', nama: guru?.nama ?? '-' },
        bobotCoins: Math.abs(p.coins_penalty || 0),
        buktiUrl: p.bukti_foto_url ?? null,
      };
    });

    return { success: true, data: result };
  }

  // =====================================================
  // KONSELOR: GET JENIS PELANGGARAN
  // =====================================================
  async getJenisPelanggaran() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('jenis_pelanggaran')
      .select('id, nama, kategori, bobot_coins, deskripsi, is_active')
      .order('kategori', { ascending: true })
      .order('nama', { ascending: true });

    if (error) throw new BadRequestException('Gagal mengambil jenis pelanggaran');
    return { success: true, data: data || [] };
  }

  // =====================================================
  // KONSELOR: CREATE JENIS PELANGGARAN
  // =====================================================
  async createJenisPelanggaran(dto: {
    nama: string;
    kategori: 'ringan' | 'sedang' | 'berat';
    bobot_coins: number;
    deskripsi?: string;
  }) {
    const supabase = this.supabaseService.getClient();
    const nama = dto.nama?.trim();
    const kategoriList = ['ringan', 'sedang', 'berat'];

    if (!nama) throw new BadRequestException('Nama pelanggaran wajib diisi');
    if (!kategoriList.includes(dto.kategori)) throw new BadRequestException('Kategori pelanggaran tidak valid');
    if (!Number.isFinite(dto.bobot_coins) || dto.bobot_coins <= 0) {
      throw new BadRequestException('Bobot coins harus berupa angka lebih dari 0');
    }

    const bobotCoins = Math.round(dto.bobot_coins);

    const { data: existed, error: cekError } = await supabase
      .from('jenis_pelanggaran')
      .select('id, nama')
      .ilike('nama', nama)
      .maybeSingle();

    if (cekError) throw new BadRequestException(`Gagal validasi jenis pelanggaran: ${cekError.message}`);
    if (existed) throw new BadRequestException('Nama jenis pelanggaran sudah ada');

    const { data, error } = await supabase
      .from('jenis_pelanggaran')
      .insert([{ nama, kategori: dto.kategori, bobot_coins: bobotCoins, deskripsi: dto.deskripsi?.trim() || null, is_active: true }])
      .select('id, nama, kategori, bobot_coins, deskripsi, is_active')
      .single();

    if (error) throw new BadRequestException(`Gagal membuat jenis pelanggaran: ${error.message}`);
    return { success: true, data };
  }

  // =====================================================
  // KONSELOR: UPDATE JENIS PELANGGARAN
  // =====================================================
  async updateJenisPelanggaran(
    id: number,
    dto: Partial<{ nama: string; kategori: string; bobot_coins: number; deskripsi: string; is_active: boolean }>,
  ) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('jenis_pelanggaran').select('id, nama').eq('id', id).maybeSingle();

    if (!existing) throw new BadRequestException('Jenis pelanggaran tidak ditemukan');

    const updateData: Record<string, any> = {};
    if (dto.nama !== undefined) updateData.nama = dto.nama.trim();
    if (dto.kategori !== undefined) updateData.kategori = dto.kategori;
    if (dto.bobot_coins !== undefined) updateData.bobot_coins = dto.bobot_coins;
    if (dto.deskripsi !== undefined) updateData.deskripsi = dto.deskripsi;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const { data, error } = await supabase
      .from('jenis_pelanggaran')
      .update(updateData).eq('id', id)
      .select('id, nama, kategori, bobot_coins, deskripsi, is_active')
      .single();

    if (error) throw new BadRequestException('Gagal mengupdate jenis pelanggaran');
    return { success: true, data };
  }

  // =====================================================
  // KONSELOR: DELETE JENIS PELANGGARAN
  // =====================================================
  async deleteJenisPelanggaran(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('jenis_pelanggaran').select('id, nama').eq('id', id).maybeSingle();

    if (!existing) throw new BadRequestException('Jenis pelanggaran tidak ditemukan');

    const { error } = await supabase.from('jenis_pelanggaran').delete().eq('id', id);

    if (error) throw new BadRequestException('Gagal menghapus jenis pelanggaran');
    return { success: true, message: `${existing.nama} berhasil dihapus` };
  }

  // =====================================================
  // KONSELOR: TOGGLE AKTIF/NONAKTIF JENIS PELANGGARAN
  // =====================================================
  async toggleJenisPelanggaran(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('jenis_pelanggaran').select('id, is_active').eq('id', id).maybeSingle();

    if (!existing) throw new BadRequestException('Jenis pelanggaran tidak ditemukan');

    const { data, error } = await supabase
      .from('jenis_pelanggaran')
      .update({ is_active: !existing.is_active }).eq('id', id)
      .select('id, nama, kategori, bobot_coins, deskripsi, is_active')
      .single();

    if (error) throw new BadRequestException('Gagal mengubah status');
    return { success: true, data };
  }

  // =====================================================
  // KONSELOR: UPDATE STATUS PELANGGARAN
  // Jika approved → kurangi coins siswa
  // =====================================================
  async updatePelanggaranStatus(id: number, status: 'approved' | 'rejected', verifiedByNip: string) {
    const supabase = this.supabaseService.getClient();

    const { data: existing, error: fetchError } = await supabase
      .from('pelanggaran')
      .select('id, status, nis, coins_penalty')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existing) throw new BadRequestException('Pelanggaran tidak ditemukan');

    if (existing.status !== 'pending') {
      throw new BadRequestException(`Pelanggaran ini sudah diproses dengan status: ${existing.status}`);
    }

    // ✅ FIX: pakai WIB bukan UTC agar verified_at tersimpan dengan tanggal yang benar
    const now = this.nowWIB();

    const { data, error } = await supabase
      .from('pelanggaran')
      .update({
        status,
        verified_by: verifiedByNip,
        verified_at: now,           // ← sekarang WIB, bukan UTC
      })
      .eq('id', id)
      .select('id, status, verified_by, verified_at')
      .single();

    if (error) throw new BadRequestException('Gagal mengupdate status pelanggaran');

    if (status === 'approved') {
      const penalty = Math.abs(existing.coins_penalty || 0);

      if (penalty > 0) {
        const { data: siswa, error: siswaError } = await supabase
          .from('siswa')
          .select('nis, coins')
          .eq('nis', existing.nis)
          .maybeSingle();

        if (siswaError || !siswa) {
          throw new BadRequestException('Gagal mengambil data siswa untuk update coins');
        }

        const coinsBaru = Math.max(0, (siswa.coins ?? 0) - penalty);

        const { error: updateError } = await supabase
          .from('siswa')
          .update({ coins: coinsBaru })
          .eq('nis', existing.nis);

        if (updateError) {
          throw new BadRequestException('Status berhasil diupdate, tapi gagal mengurangi coins siswa');
        }
      }
    }

    return { success: true, data: { ...data, coinsUpdated: status === 'approved' } };
  }
}

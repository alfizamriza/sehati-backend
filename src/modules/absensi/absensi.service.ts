import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AchievementService } from 'src/modules/achievement/achievement.service';
import { StreakService } from 'src/modules/streak/streak.service';

@Injectable()
export class AbsensiService {
  constructor(
    private supabaseService: SupabaseService,
    private achievementService: AchievementService,
    private streakService: StreakService,
  ) {}

  private normalizePetugas(actor: {
    guruNip?: string | null;
    siswaNis?: string | null;
  }): { guruNip: string | null; siswaNis: string | null } {
    return {
      guruNip: actor.guruNip ? String(actor.guruNip).trim() : null,
      siswaNis: actor.siswaNis ? String(actor.siswaNis).trim() : null,
    };
  }

  // =====================================================
  // HELPER: GET TODAY'S DATE (timezone-safe, server local)
  // Menggunakan locale date agar tidak terjadi date shift
  // akibat perbedaan timezone server vs UTC
  // =====================================================
  private getTodayString(): string {
    // Paksa gunakan zona waktu Asia/Jakarta via Intl agar konsisten di semua host
    const wibString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const wibDate = new Date(wibString);
    const year = wibDate.getFullYear();
    const month = String(wibDate.getMonth() + 1).padStart(2, '0');
    const day = String(wibDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // =====================================================
  // AMBIL COINS REWARD DARI TABEL PENGATURAN
  // =====================================================
  private async getCoinsReward(): Promise<number> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('pengaturan')
      .select('value')
      .eq('key', 'coins_tumbler')
      .maybeSingle();
    return parseInt(data?.value || '10', 10);
  }

  // =====================================================
  // CEK HARI LIBUR — return detail info
  // FIX: .eq('is_active', 'true') — kolom bertipe TEXT,
  //      bukan boolean, sehingga harus pakai string 'true'
  // =====================================================
  private async getInfoLibur(
    tanggal: string,
  ): Promise<{ isLibur: boolean; keterangan: string }> {
    const supabase = this.supabaseService.getClient();
    const date = new Date(tanggal);
    const dayOfWeek = date.getDay(); // 0=Minggu, 6=Sabtu

    if (dayOfWeek === 6) return { isLibur: true, keterangan: 'Hari Sabtu' };
    if (dayOfWeek === 0) return { isLibur: true, keterangan: 'Hari Minggu' };

    // FIX: pakai string 'true' karena kolom is_active bertipe TEXT
    const { data } = await supabase
      .from('tanggal_libur')
      .select('keterangan')
      .eq('tanggal', tanggal)
      .eq('is_active', 'true') // ← FIXED: was `true` (boolean), now `'true'` (string)
      .maybeSingle();

    if (data) {
      return { isLibur: true, keterangan: data.keterangan };
    }

    return { isLibur: false, keterangan: '' };
  }

  // Wrapper boolean — dipakai di getHariSekolahSebelumnya
  private async isHariLibur(tanggal: string): Promise<boolean> {
    const { isLibur } = await this.getInfoLibur(tanggal);
    return isLibur;
  }

  // Cek apakah siswa punya izin/sakit yang sudah di-approve pada tanggal tsb.
  private async isStudentExcused(tanggal: string, nis: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('siswa_izin')
      .select('id')
      .eq('nis', nis)
      .eq('tanggal', tanggal)
      .eq('status', 'approved')
      .maybeSingle();

    return !!data;
  }

  // =====================================================
  // CARI HARI SEKOLAH SEBELUMNYA
  // FIX: sama, pakai string 'true' untuk is_active
  // =====================================================
  private async getHariSekolahSebelumnya(dari: string, nis: string): Promise<string | null> {
    const supabase = this.supabaseService.getClient();

    const batasAwal = new Date(dari);
    batasAwal.setDate(batasAwal.getDate() - 14);
    const batasAwalStr = batasAwal.toISOString().split('T')[0];

    const { data: liburRows } = await supabase
      .from('tanggal_libur')
      .select('tanggal')
      .eq('is_active', 'true')
      .gte('tanggal', batasAwalStr)
      .lt('tanggal', dari);

    const setLibur = new Set((liburRows || []).map((r) => r.tanggal));

    let current = new Date(dari);
    for (let i = 0; i < 14; i++) {
      current.setDate(current.getDate() - 1);
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6 || setLibur.has(dateStr)) continue;
      if (await this.isStudentExcused(dateStr, nis)) continue;

      return dateStr;
    }

    return null;
  }

  // =====================================================
  // HITUNG STREAK BARU
  // =====================================================
  private async hitungStreak(
    currentStreak: number,
    lastDate: string | null,
    today: string,
    nis: string,
  ): Promise<{ newStreak: number; streakBonus: number }> {
    if (!lastDate) return { newStreak: 1, streakBonus: 0 };

    const hariSekolahSebelumnya = await this.getHariSekolahSebelumnya(today, nis);
    const newStreak =
      hariSekolahSebelumnya && lastDate === hariSekolahSebelumnya
        ? currentStreak + 1
        : 1;

    return { newStreak, streakBonus: this.getStreakBonus(newStreak) };
  }

  private getStreakBonus(streak: number): number {
    if (streak % 100 === 0) return 500;
    if (streak % 30 === 0) return 100;
    if (streak % 10 === 0) return 30;
    if (streak % 5 === 0) return 10;
    return 0;
  }

  private toRoman(value: number): string {
    const romanMap: Record<number, string> = {
      1: 'I',
      2: 'II',
      3: 'III',
      4: 'IV',
      5: 'V',
      6: 'VI',
      7: 'VII',
      8: 'VIII',
      9: 'IX',
      10: 'X',
      11: 'XI',
      12: 'XII',
    };

    return romanMap[value] || value.toString();
  }

  // =====================================================
  // SCAN QR
  // =====================================================
  async scanAbsensi(
    nis: string,
    actor: { guruNip?: string | null; siswaNis?: string | null },
  ) {
    return this.prosesAbsensi(nis, actor, 'scan');
  }

  // =====================================================
  // ABSEN MANUAL SATU SISWA
  // =====================================================
  async manualAbsensi(
    nis: string,
    actor: { guruNip?: string | null; siswaNis?: string | null },
  ) {
    return this.prosesAbsensi(nis, actor, 'manual');
  }

  // =====================================================
  // ABSEN MANUAL BULK
  // =====================================================
  async bulkManualAbsensi(
    nisList: string[],
    actor: { guruNip?: string | null; siswaNis?: string | null },
  ) {
    const results = await Promise.allSettled(
      nisList.map((nis) => this.prosesAbsensi(nis, actor, 'manual')),
    );

    const berhasil: string[] = [];
    const gagal: { nis: string; alasan: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        berhasil.push(nisList[index]);
      } else {
        gagal.push({
          nis: nisList[index],
          alasan: result.reason?.message || 'Gagal',
        });
      }
    });

    return { success: true, data: { berhasil, gagal } };
  }

  // =====================================================
  // CORE PROSES ABSENSI
  // FIX: pakai getTodayString() agar aman dari timezone shift
  // =====================================================
  private async prosesAbsensi(
    nis: string,
    actor: { guruNip?: string | null; siswaNis?: string | null },
    method: 'scan' | 'manual',
  ) {
    const supabase = this.supabaseService.getClient();
    const { guruNip, siswaNis } = this.normalizePetugas(actor);
    const today = this.getTodayString(); // ← FIXED: was `new Date().toISOString().split('T')[0]`

    // 1. Cek hari libur
    const infoLibur = await this.getInfoLibur(today);
    if (infoLibur.isLibur) {
      throw new BadRequestException(
        JSON.stringify({
          code: 'HARI_LIBUR',
          keterangan: infoLibur.keterangan,
          message: `Hari ini libur: ${infoLibur.keterangan}. Absensi tidak dapat dilakukan.`,
        }),
      );
    }

    // 2. Ambil coins reward dari pengaturan
    const coinsReward = await this.getCoinsReward();

    // 3. Cek siswa ada dan aktif
    const { data: siswa } = await supabase
      .from('siswa')
      .select('nis, nama, coins, streak, last_streak_date, is_active')
      .eq('nis', nis)
      .maybeSingle();

    if (!siswa || !siswa.is_active) {
      throw new BadRequestException(
        `Siswa ${nis} tidak ditemukan atau tidak aktif`,
      );
    }

    // 3b. Blokir jika siswa punya izin/sakit approved hari ini
    const excusedToday = await this.isStudentExcused(today, nis);
    if (excusedToday) {
      throw new BadRequestException(
        JSON.stringify({
          code: 'IZIN_HARI_INI',
          message: `${siswa.nama} memiliki izin/sakit hari ini. Absensi ditolak.`,
        }),
      );
    }

    // 4. Cek sudah absen hari ini
    const { data: existing } = await supabase
      .from('absensi_tumbler')
      .select('id')
      .eq('nis', nis)
      .eq('tanggal', today)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(`${siswa.nama} sudah absen tumbler hari ini`);
    }

    // 5. Hitung streak baru
    const { newStreak, streakBonus } = await this.hitungStreak(
      siswa.streak || 0,
      siswa.last_streak_date,
      today,
      nis,
    );
    const totalCoins = coinsReward + streakBonus;

    const insertPayload = {
      nis,
      tanggal: today,
      waktu: new Date().toTimeString().split(' ')[0],
      coins_reward: coinsReward,
      streak_bonus: streakBonus,
      method,
      ...(guruNip ? { nip: guruNip } : {}),
      ...(siswaNis ? { siswa_nis: siswaNis } : {}),
    };

    // 6. Insert ke absensi_tumbler
    const { error: insertError } = await supabase
      .from('absensi_tumbler')
      .insert([insertPayload]);

    if (insertError) {
      throw new BadRequestException(`Gagal mencatat absensi: ${insertError.message}`);
    }

    // 7. Update streak siswa
    await supabase
      .from('siswa')
      .update({ streak: newStreak, last_streak_date: today })
      .eq('nis', nis);

    // 8. Tambah coins via RPC
    await supabase.rpc('increment_coins', {
      target_nis: nis,
      amount_to_add: totalCoins,
    });

    // 9. Cek achievement di background
    this.triggerAchievementCheck(nis).catch((err) =>
      console.error(`[Achievement] Error untuk ${nis}:`, err),
    );

    return {
      success: true,
      data: { nis, nama: siswa.nama, coinsEarned: coinsReward, streakBonus, totalCoins, newStreak, method },
    };
  }

  private async triggerAchievementCheck(nis: string): Promise<void> {
    await Promise.all([
      this.achievementService.checkAndUnlockAchievements(nis, 'tumbler'),
      this.achievementService.checkAndUnlockAchievements(nis, 'streak'),
      this.achievementService.checkAndUnlockAchievements(nis, 'coins'),
    ]);
  }

  // =====================================================
  // GET SISWA PER KELAS + STATUS ABSEN HARI INI
  // =====================================================
  async getSiswaByKelas(kelasId: number) {
    const supabase = this.supabaseService.getClient();
    const today = this.getTodayString(); // ← FIXED

    const { data: siswas, error } = await supabase
      .from('siswa')
      .select('nis, nama, streak, coins')
      .eq('kelas_id', kelasId)
      .eq('is_active', true)
      .order('nama', { ascending: true });

    if (error || !siswas) throw new BadRequestException('Gagal mengambil data siswa');

    if (siswas.length === 0) {
      return { success: true, data: [], meta: { total: 0, sudahAbsen: 0, belumAbsen: 0, tanggal: today } };
    }

    const nisList = siswas.map((s) => s.nis);
    const { data: sudahAbsen } = await supabase
      .from('absensi_tumbler')
      .select('nis')
      .in('nis', nisList)
      .eq('tanggal', today);

    const sudahAbsenSet = new Set((sudahAbsen || []).map((a) => a.nis));

    // Ambil izin approved hari ini
    const { data: izinRows } = await supabase
      .from('siswa_izin')
      .select('nis, tipe, catatan')
      .in('nis', nisList)
      .eq('tanggal', today)
      .eq('status', 'approved');

    const izinMap = new Map<string, { tipe: string; catatan: string | null }>();
    (izinRows || []).forEach((row) =>
      izinMap.set(row.nis, { tipe: row.tipe, catatan: row.catatan ?? null }),
    );

    const result = await Promise.all(
      siswas.map(async (siswa) => {
        const streakData = await this.streakService.calculateStreak(siswa.nis);
        const izin = izinMap.get(siswa.nis);
        const adaIzin = Boolean(izin);
        const sudahAbsen = adaIzin ? false : sudahAbsenSet.has(siswa.nis);
        return {
          nis: siswa.nis,
          nama: siswa.nama,
          streak: streakData.currentStreak,
          coins: siswa.coins || 0,
          sudahAbsen,
          izinHariIni: adaIzin
            ? { ada: true, tipe: izin?.tipe || null, catatan: izin?.catatan || null }
            : { ada: false, tipe: null, catatan: null },
        };
      }),
    );

    result.sort((a, b) => {
      if (a.sudahAbsen === b.sudahAbsen) return a.nama.localeCompare(b.nama);
      return a.sudahAbsen ? 1 : -1;
    });

    return {
      success: true,
      data: result,
      meta: {
        total: result.length,
        sudahAbsen: sudahAbsenSet.size,
        belumAbsen: result.length - sudahAbsenSet.size,
        tanggal: today,
      },
    };
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
    const mappedData = (data || []).map((kelas) => ({
      ...kelas,
      tingkat: this.toRoman(Number(kelas.tingkat)),
    }));

    return { success: true, data: mappedData };
  }

  // =====================================================
  // GET RIWAYAT ABSENSI SISWA
  // =====================================================
  async getRiwayat(nis: string, limit = 10) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('absensi_tumbler')
      .select('id, tanggal, waktu, coins_reward, streak_bonus, method')
      .eq('nis', nis)
      .order('tanggal', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException('Gagal mengambil riwayat');
    return { success: true, data: data || [] };
  }

  // =====================================================
  // GET STATUS ABSEN HARI INI (1 SISWA)
  // =====================================================
  async getStatusHariIni(nis: string) {
    const supabase = this.supabaseService.getClient();
    const today = this.getTodayString(); // ← FIXED

    const { data } = await supabase
      .from('absensi_tumbler')
      .select('id, waktu, coins_reward, streak_bonus, method')
      .eq('nis', nis)
      .eq('tanggal', today)
      .maybeSingle();

    return { success: true, data: { sudahAbsen: !!data, detail: data || null } };
  }

  // =====================================================
  // GET INFO HARI INI — endpoint publik
  // =====================================================
  async getInfoHariIni() {
    const today = this.getTodayString(); // ← FIXED
    const info = await this.getInfoLibur(today);
    return {
      success: true,
      data: {
        tanggal: today,
        isLibur: info.isLibur,
        keterangan: info.keterangan || null,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class StreakService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Dapatkan tanggal hari ini dalam WIB (UTC+7) sebagai string 'YYYY-MM-DD'.
   * JANGAN pakai new Date().toISOString() karena itu UTC — bisa beda hari
   * dengan kolom `tanggal` di absensi_tumbler yang disimpan dalam WIB.
   */
  private getTodayWIB(): string {
    const wibString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const wibDate = new Date(wibString);
    const y = wibDate.getFullYear();
    const m = String(wibDate.getMonth() + 1).padStart(2, '0');
    const d = String(wibDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseDateOnly(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  /**
   * Cek apakah siswa memiliki izin/sakit yang disetujui pada tanggal tertentu.
   */
  private async isStudentExcused(date: Date, nis: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();
    const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const dateStr = wibDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('siswa_izin')
      .select('id')
      .eq('nis', nis)
      .eq('tanggal', dateStr)
      .eq('status', 'approved')
      .maybeSingle();

    return !!data;
  }

  /**
   * Cek apakah tanggal adalah hari libur
   */
  async isHoliday(date: Date): Promise<boolean> {
    const supabase = this.supabaseService.getClient();
    // FIX: pakai WIB agar konsisten dengan kolom tanggal di DB
    const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const dateStr = wibDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('tanggal_libur')
      .select('id')
      .eq('tanggal', dateStr)
      .eq('is_active', true)
      .single();

    return !!data;
  }

  /**
   * Cek apakah tanggal adalah Sabtu/Minggu
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Cek apakah tanggal adalah hari kerja (non-weekend, non-holiday)
   */
  async isWorkday(date: Date, nis?: string): Promise<boolean> {
    if (this.isWeekend(date)) return false;
    const holiday = await this.isHoliday(date);
    if (holiday) return false;

    if (nis) {
      const excused = await this.isStudentExcused(date, nis);
      if (excused) return false;
    }

    return true;
  }

  /**
   * Calculate streak untuk siswa.
   *
   * ROOT CAUSE FIX:
   *   Sebelumnya: todayStr = new Date().toISOString().split('T')[0]  ← UTC
   *   Akibatnya:  jam 00:00–06:59 WIB → todayStr = tanggal kemarin
   *               query .eq('tanggal', todayStr) gagal menemukan absensi hari ini
   *               → isStreakActiveToday = false → shouldShowFaded = true (salah!)
   *
   *   Fix: pakai getTodayWIB() yang menambah offset +7 jam sebelum format string.
   */
  async calculateStreak(nis: string): Promise<{
    currentStreak: number;
    isStreakActiveToday: boolean;
    shouldShowFaded: boolean;
  }> {
    const supabase = this.supabaseService.getClient();

    const { data: siswa } = await supabase
      .from('siswa')
      .select('streak, last_streak_date')
      .eq('nis', nis)
      .single();

    if (!siswa) {
      return { currentStreak: 0, isStreakActiveToday: false, shouldShowFaded: false };
    }

    // ✅ FIX: gunakan tanggal WIB, bukan UTC
    const todayStr = this.getTodayWIB();

    const { data: absenToday } = await supabase
      .from('absensi_tumbler')
      .select('id')
      .eq('nis', nis)
      .eq('tanggal', todayStr)   // ← sekarang cocok dengan data di DB (WIB)
      .single();

    const isStreakActiveToday = !!absenToday;

    // Cek apakah hari ini hari kerja
    const today = this.parseDateOnly(todayStr);
    const isTodayWorkday = await this.isWorkday(today, nis);

    let effectiveStreak = siswa.streak || 0;

    if (!isStreakActiveToday) {
      const lastStreakDate = siswa.last_streak_date
        ? this.parseDateOnly(siswa.last_streak_date)
        : null;

      if (!lastStreakDate) {
        effectiveStreak = 0;
      } else {
        const workdaysSinceLastStreak = await this.countWorkdaysBetween(
          lastStreakDate,
          today,
          nis,
        );

        if (workdaysSinceLastStreak > 1) {
          effectiveStreak = 0;
        }
      }
    }

    // Faded hanya jika streak masih valid, hari ini hari kerja, tapi belum absen
    const shouldShowFaded =
      effectiveStreak > 0 &&
      isTodayWorkday &&
      !isStreakActiveToday;

    return {
      currentStreak: effectiveStreak,
      isStreakActiveToday,
      shouldShowFaded,
    };
  }

  /**
   * Update streak setelah absensi tumbler.
   * Dipanggil dari absensi-tumbler.service.ts
   */
  async updateStreakAfterAbsensi(nis: string, tanggalAbsensi: Date): Promise<number> {
    const supabase = this.supabaseService.getClient();

    const { data: siswa } = await supabase
      .from('siswa')
      .select('streak, last_streak_date')
      .eq('nis', nis)
      .single();

    if (!siswa) return 0;

    const absenDate = new Date(tanggalAbsensi);
    absenDate.setHours(0, 0, 0, 0);

    const lastStreakDate = siswa.last_streak_date
      ? new Date(siswa.last_streak_date)
      : null;

    if (lastStreakDate) {
      lastStreakDate.setHours(0, 0, 0, 0);
    }

    let newStreak = siswa.streak || 0;

    if (!lastStreakDate) {
      newStreak = 1;
    } else {
      const daysSinceLastStreak = await this.countWorkdaysBetween(lastStreakDate, absenDate, nis);

      if (daysSinceLastStreak === 1) {
        newStreak += 1;
      } else if (daysSinceLastStreak > 1) {
        newStreak = 1;
      } else {
        // Absen di hari yang sama (duplikat), streak tidak berubah
        newStreak = siswa.streak;
      }
    }

    await supabase
      .from('siswa')
      .update({
        streak: newStreak,
        last_streak_date: absenDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('nis', nis);

    return newStreak;
  }

  /**
   * Hitung jumlah hari kerja antara 2 tanggal (exclude start, include end)
   */
  async countWorkdaysBetween(startDate: Date, endDate: Date, nis?: string): Promise<number> {
    let count = 0;
    const current = new Date(startDate);

    while (current < endDate) {
      current.setDate(current.getDate() + 1);
      if (await this.isWorkday(current, nis)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get top streaks (untuk leaderboard)
   */
  async getTopStreaks(limit: number = 10): Promise<Array<{
    nis: string;
    nama: string;
    kelas: string;
    streak: number;
  }>> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('siswa')
      .select(`
        nis,
        nama,
        streak,
        kelas:kelas_id (id, nama, tingkat)
      `)
      .eq('is_active', true)
      .order('streak', { ascending: false })
      .order('last_streak_date', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((s) => {
      const kelas = Array.isArray(s.kelas) ? s.kelas[0] : s.kelas;
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: kelas ? `${kelas.tingkat}-${kelas.nama}` : '-',
        streak: s.streak || 0,
      };
    });
  }

  /**
   * Get ranking streak siswa
   */
  async getStreakRank(nis: string): Promise<number> {
    const supabase = this.supabaseService.getClient();

    const { data: siswa } = await supabase
      .from('siswa')
      .select('streak')
      .eq('nis', nis)
      .single();

    if (!siswa) return 0;

    const { count } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('streak', siswa.streak || 0);

    return (count || 0) + 1;
  }
}

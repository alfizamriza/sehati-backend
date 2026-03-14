import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { StreakService } from 'src/modules/streak/streak.service';

interface SchoolDay { date: string; label: string }

export type DayStatus = 'hadir' | 'pelanggaran' | 'plastik' | 'libur' | 'kosong';

export interface CalendarDay {
  date: string; label: string; dayName: string;
  status: DayStatus; isToday: boolean; isWeekend: boolean;
  hadir: boolean; pelanggaranCount: number; plastikCount: number;
  keteranganLibur: string | null;  // ← baru: nama hari libur untuk tooltip
}

export interface ComplianceItem {
  name: string; date: string;
  plastic: number; compliance: number; isToday: boolean;
}

@Injectable()
export class SiswaDashboardService {
  constructor(
    private supabaseService: SupabaseService,
    private streakService: StreakService,
  ) { }

  private convertToRomanNumeral(num: number): string {
    const romanNumerals = [
      { value: 12, numeral: 'XII' }, { value: 11, numeral: 'XI' },
      { value: 10, numeral: 'X' }, { value: 9, numeral: 'IX' },
      { value: 8, numeral: 'VIII' }, { value: 7, numeral: 'VII' },
      { value: 6, numeral: 'VI' }, { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' }, { value: 3, numeral: 'III' },
      { value: 2, numeral: 'II' }, { value: 1, numeral: 'I' },
    ];
    let result = ''; let remaining = num;
    for (const { value, numeral } of romanNumerals) {
      while (remaining >= value) { result += numeral; remaining -= value; }
    }
    return result || String(num);
  }

  // =====================================================
  // DASHBOARD MAIN
  // =====================================================
  async getDashboard(
    nis: string,
    mode: 'month' = 'month',
    year?: number,
    month?: number,
  ) {
    const [
      siswaData, streakData, rankData,
      pelanggaranCount, leaderboardData, historyData, calendarDays,
    ] = await Promise.all([
      this.getSiswaProfile(nis),
      this.streakService.calculateStreak(nis),
      this.getCoinRank(nis),
      this.getPelanggaranCount(nis),
      this.getLeaderboard(nis),
      this.getRecentHistory(nis),
      this.getCalendarData(nis, mode, year, month),
    ]);

    const complianceChart: ComplianceItem[] = calendarDays.map((d) => ({
      name: d.label, date: d.date,
      plastic: d.plastikCount, compliance: d.hadir ? 100 : 0,
      isToday: d.isToday,
    }));

    return {
      success: true,
      data: {
        profile: siswaData,
        streak: {
          current: streakData.currentStreak,
          isActiveToday: streakData.isStreakActiveToday,
          shouldShowFaded: streakData.shouldShowFaded,
        },
        ranking: rankData, pelanggaran: pelanggaranCount,
        leaderboard: leaderboardData, recentHistory: historyData,
        complianceChart, calendarDays,
      },
    };
  }

  // =====================================================
  // CALENDAR HEATMAP DATA
  // =====================================================
  private async getCalendarData(
    nis: string,
    mode: 'month',
    year?: number,
    month?: number,
  ): Promise<CalendarDay[]> {
    const supabase = this.supabaseService.getClient();
    const today = this.formatDateLocal(new Date());

    // FIX 1: Selalu ambil SELURUH bulan (bukan sampai hari ini)
    // agar tanggal libur masa depan bisa terdeteksi
    const days = this.getMonthDays(year, month);
    const allDates = days.map((d) => d.date);
    const dateFrom = allDates[0];
    const dateTo = allDates[allDates.length - 1];

    // ── 1. Absensi tumbler ──────────────────────────────
    const { data: tumblerRows } = await supabase
      .from('absensi_tumbler').select('tanggal')
      .eq('nis', nis).in('tanggal', allDates);

    // ── 2. Pelanggaran approved ─────────────────────────
    const { data: pelanggaranRows } = await supabase
      .from('pelanggaran').select('tanggal')
      .eq('nis', nis).eq('status', 'approved').in('tanggal', allDates);

    // ── 3. Transaksi plastik ────────────────────────────
    const { data: transaksiRows } = await supabase
      .from('transaksi')
      .select('created_at, detail_transaksi (produk:produk_id (jenis_kemasan))')
      .eq('nis', nis)
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59');

    const plastikByDate: Record<string, number> = {};
    (transaksiRows ?? []).forEach((t) => {
      const tgl = t.created_at?.split('T')[0];
      if (!tgl || !allDates.includes(tgl)) return;
      const details = Array.isArray(t.detail_transaksi) ? t.detail_transaksi : [t.detail_transaksi];
      details.forEach((dt: any) => {
        const produk = Array.isArray(dt?.produk) ? dt.produk[0] : dt?.produk;
        if (produk?.jenis_kemasan === 'plastik') {
          plastikByDate[tgl] = (plastikByDate[tgl] || 0) + 1;
        }
      });
    });

    const hadirDates = new Set((tumblerRows ?? []).map((r) => String(r.tanggal).split('T')[0]));
    const pelanggaranByDate: Record<string, number> = {};
    (pelanggaranRows ?? []).forEach((r) => {
      const tgl = String(r.tanggal).split('T')[0];
      pelanggaranByDate[tgl] = (pelanggaranByDate[tgl] || 0) + 1;
    });

    // ── 4. Tanggal libur dari DB (seluruh bulan, termasuk masa depan) ──
    const { data: liburRows } = await supabase
      .from('tanggal_libur').select('tanggal, keterangan')
      .eq('is_active', true)
      .gte('tanggal', dateFrom)
      .lte('tanggal', dateTo);

    const liburDates = new Set((liburRows ?? []).map((r: any) => String(r.tanggal).split('T')[0]));
    // Map keterangan untuk tooltip di frontend
    const liburKeterangan = new Map<string, string>(
      (liburRows ?? []).map((r: any) => [String(r.tanggal).split('T')[0], r.keterangan as string])
    );

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return days.map((day) => {
      const d = new Date(day.date + 'T00:00:00');
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isToday = day.date === today;
      const isFuture = day.date > today;
      const isHoliday = isWeekend || liburDates.has(day.date);
      const hadir = hadirDates.has(day.date);
      const pelanggaranCount = pelanggaranByDate[day.date] || 0;
      const plastikCount = plastikByDate[day.date] || 0;

      // FIX 2: Status priority yang benar
      // - Libur/weekend → selalu "libur" (termasuk masa depan)
      // - Masa depan non-libur → "kosong" (belum terjadi, tidak ada data)
      // - Pelanggaran prioritas tertinggi untuk hari lampau
      // - Plastik bisa muncul meski tidak hadir (beli tapi tidak bawa tumbler)
      let status: DayStatus = 'kosong';
      if (isHoliday) status = 'libur';
      else if (isFuture) status = 'kosong';
      else if (pelanggaranCount > 0) status = 'pelanggaran';
      else if (plastikCount > 0) status = 'plastik';
      else if (hadir) status = 'hadir';
      // else tetap 'kosong' = tidak bawa tumbler, tidak ada pelanggaran/plastik

      return {
        date: day.date,
        label: String(d.getDate()),
        dayName: dayNames[dow],
        status,
        isToday,
        isWeekend,
        hadir,
        pelanggaranCount,
        plastikCount,
        // Keterangan libur: dari DB jika ada, fallback "Akhir pekan" untuk weekend
        keteranganLibur: isHoliday
          ? (liburKeterangan.get(day.date) ?? (isWeekend ? 'Akhir pekan' : null))
          : null,
      };
    });
  }

  // =====================================================
  // DATE HELPERS
  // =====================================================

  /**
   * FIX 3: Selalu ambil SELURUH bulan, bukan sampai hari ini.
   * Frontend yang bertanggung jawab menyembunyikan / greying out
   * tanggal masa depan — backend cukup kirim semua data termasuk
   * tanggal libur yang belum terjadi.
   */
  private getMonthDays(year?: number, month?: number): SchoolDay[] {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? (now.getMonth() + 1); // 1-based

    // Selalu ambil seluruh hari dalam bulan (bukan sampai hari ini)
    const totalDays = new Date(y, m, 0).getDate();

    const days: SchoolDay[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(y, m - 1, d);
      days.push({ date: this.formatDateLocal(dt), label: String(d) });
    }
    return days;
  }

  private formatDateLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─── Methods lain tidak berubah ───────────────────────────────
  private async getSiswaProfile(nis: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('siswa').select('nis, nama, coins, streak, kelas:kelas_id (nama, tingkat)')
      .eq('nis', nis).maybeSingle();
    if (error || !data) throw new BadRequestException('Siswa tidak ditemukan');
    const kelas = Array.isArray(data.kelas) ? data.kelas[0] : data.kelas;
    const tingkatRoman = kelas ? this.convertToRomanNumeral((kelas as any).tingkat) : '';
    return {
      nis: data.nis, nama: data.nama, coins: (data as any).coins || 0,
      streak: (data as any).streak || 0,
      kelas: kelas ? `${tingkatRoman}-${(kelas as any).nama}` : '-',
    };
  }

  private async getCoinRank(nis: string) {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase.from('siswa').select('nis')
      .eq('is_active', true).order('coins', { ascending: false });
    const index = data?.findIndex((s) => s.nis === nis) ?? -1;
    return { position: index + 1, totalSiswa: data?.length || 0 };
  }

  private async getLeaderboard(currentNis: string) {
    const supabase = this.supabaseService.getClient();
    const { data: topSiswa } = await supabase.from('siswa')
      .select('nis, nama, coins, streak, kelas:kelas_id (nama, tingkat)')
      .eq('is_active', true).order('coins', { ascending: false }).limit(3);
    return (topSiswa ?? []).map((item, index) => {
      const kelas = Array.isArray(item.kelas) ? item.kelas[0] : item.kelas;
      const tingkatRoman = kelas ? this.convertToRomanNumeral((kelas as any).tingkat) : '';
      return {
        rank: index + 1, nis: item.nis, nama: item.nama,
        kelas: kelas ? `${tingkatRoman}-${(kelas as any).nama}` : '-',
        coins: (item as any).coins || 0, streak: (item as any).streak || 0,
        medal: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze',
        isMe: item.nis === currentNis,
      };
    });
  }

  private async getPelanggaranCount(nis: string) {
    const supabase = this.supabaseService.getClient();
    const { count } = await supabase.from('pelanggaran')
      .select('*', { count: 'exact', head: true })
      .eq('nis', nis).eq('status', 'approved');
    return count || 0;
  }

  private async getRecentHistory(nis: string) {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase.from('transaksi').select('created_at, coins_used')
      .eq('nis', nis).order('created_at', { ascending: false }).limit(5);
    return (data ?? []).map((t) => ({
      title: 'Belanja Kantin', date: t.created_at,
      amount: -(t as any).coins_used, type: 'minus' as const, category: 'transaksi' as const,
    }));
  }
}
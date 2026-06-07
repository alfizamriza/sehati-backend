import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { StreakService } from 'src/modules/streak/streak.service';
import { RequestCache } from 'src/common/utils/request-cache';

interface SchoolDay { date: string; label: string }

export type DayStatus = 'hadir' | 'pelanggaran' | 'plastik' | 'libur' | 'izin' | 'kosong';

type DashboardLeaderboardItem = {
  rank: number;
  nis: string;
  nama: string;
  kelas: string;
  coins: number;
  streak: number;
  medal: 'gold' | 'silver' | 'bronze' | 'none';
  is_me: boolean;
  fotoUrl: string | null;
};

type DashboardLeaderboardSnapshot = {
  position: number;
  totalSiswa: number;
  top: DashboardLeaderboardItem[];
  me?: {
    coins: number;
    streak: number;
    kelas: string;
  };
};

export interface CalendarDay {
  date: string; label: string; dayName: string;
  status: DayStatus; isToday: boolean; isWeekend: boolean;
  hadir: boolean; pelanggaranCount: number; plastikCount: number;
  keteranganLibur: string | null;  // ← nama hari libur untuk tooltip
  izin?: { tipe: string; catatan?: string | null } | null;
}

export interface ComplianceItem {
  name: string; date: string;
  plastic: number; compliance: number; isToday: boolean;
}

@Injectable()
export class SiswaDashboardService {
  private static readonly DASHBOARD_CACHE_TTL_MS = 10_000;
  private static readonly DASHBOARD_STALE_TTL_MS = 60_000;

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
    const cacheKey = `dashboard:siswa:${nis}:${mode}:${year ?? 'current'}:${month ?? 'current'}`;

    return RequestCache.getOrSet(
      cacheKey,
      SiswaDashboardService.DASHBOARD_CACHE_TTL_MS,
      async () => {
        const [
          siswaData, streakData, pelanggaranCount, leaderboardSnapshot, historyData, calendarDays,
        ] = await Promise.all([
          this.getSiswaProfile(nis),
          this.streakService.calculateStreak(nis),
          this.getPelanggaranCount(nis),
          this.getDashboardLeaderboardSnapshot(nis),
          this.getRecentHistory(nis),
          this.getCalendarData(nis, mode, year, month),
        ]);

        if (leaderboardSnapshot.me) {
          siswaData.coins = leaderboardSnapshot.me.coins;
          siswaData.streak = leaderboardSnapshot.me.streak;
          siswaData.kelas = leaderboardSnapshot.me.kelas;
        }

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
            ranking: {
              position: leaderboardSnapshot.position,
              totalSiswa: leaderboardSnapshot.totalSiswa,
            }, pelanggaran: pelanggaranCount,
            leaderboard: leaderboardSnapshot.top, recentHistory: historyData,
            complianceChart, calendarDays,
          },
        };
      },
      {
        staleTtlMs: SiswaDashboardService.DASHBOARD_STALE_TTL_MS,
        onError: (error) => {
          console.warn('[SiswaDashboardService] Falling back to stale dashboard cache:', error);
        },
      },
    );
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

    // ——— 5. Izin/sakit approved ———
    const { data: izinRows } = await supabase
      .from('siswa_izin')
      .select('tanggal, tipe, catatan, status')
      .eq('nis', nis)
      .eq('status', 'approved')
      .in('tanggal', allDates);

    const izinMap = new Map<string, { tipe: string; catatan?: string | null }>();
    (izinRows ?? []).forEach((r: any) => {
      const tgl = String(r.tanggal).split('T')[0];
      izinMap.set(tgl, { tipe: r.tipe, catatan: r.catatan ?? null });
    });

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
      // - Izin approved → status "izin" (di atas pelanggaran/plastik/hadir)
      // - Pelanggaran prioritas tertinggi untuk hari lampau
      // - Plastik bisa muncul meski tidak hadir (beli tapi tidak bawa tumbler)
      let status: DayStatus = 'kosong';
      if (isHoliday) status = 'libur';
      else if (isFuture) status = 'kosong';
      else if (izinMap.has(day.date)) status = 'izin';
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
        izin: izinMap.get(day.date) ?? null,
      };
    });
  }

  // =====================================================
  // DATE HELPERS
  // =====================================================


  private getMonthDays(year?: number, month?: number): SchoolDay[] {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? (now.getMonth() + 1); // 1-based

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
  private formatKelasFromRelation(kelasRelation: unknown): string {
    const kelas = Array.isArray(kelasRelation)
      ? kelasRelation[0]
      : kelasRelation;
    if (!kelas || typeof kelas !== 'object') return '-';

    const row = kelas as { nama?: string | null; tingkat?: number | string | null };
    const tingkatRoman = this.convertToRomanNumeral(Number(row.tingkat ?? 0));
    return row.nama ? `${tingkatRoman}-${row.nama}` : '-';
  }

  private mapLeaderboardRow(
    row: any,
    rank: number,
    nisLogin: string,
  ): DashboardLeaderboardItem {
    return {
      rank,
      nis: String(row?.nis ?? ''),
      nama: String(row?.nama ?? '-'),
      kelas: this.formatKelasFromRelation(row?.kelas),
      coins: Number(row?.coins ?? 0),
      streak: Number(row?.streak ?? 0),
      medal: rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'none',
      is_me: row?.nis === nisLogin,
      fotoUrl: row?.foto_url ?? null,
    };
  }

  private async getDashboardLeaderboardSnapshot(
    nis: string,
  ): Promise<DashboardLeaderboardSnapshot> {
    const supabase = this.supabaseService.getClient();

    const [topResult, meResult, totalResult] = await Promise.all([
      supabase
        .from('siswa')
        .select('nis, nama, coins, streak, foto_url, kelas:kelas_id (nama, tingkat)')
        .eq('is_active', true)
        .order('coins', { ascending: false })
        .order('nama', { ascending: true })
        .limit(3),
      supabase
        .from('siswa')
        .select('nis, nama, coins, streak, kelas:kelas_id (nama, tingkat)')
        .eq('nis', nis)
        .maybeSingle(),
      supabase
        .from('siswa')
        .select('nis', { count: 'exact', head: true })
        .eq('is_active', true),
    ]);

    const topRows = topResult.data ?? [];
    const meRow = meResult.data as any | null;
    const totalSiswa = totalResult.count ?? topRows.length;

    let position = 0;
    if (meRow) {
      const myCoins = Number(meRow.coins ?? 0);
      const myName = String(meRow.nama ?? '');

      const [higherResult, tieBeforeResult] = await Promise.all([
        supabase
          .from('siswa')
          .select('nis', { count: 'exact', head: true })
          .eq('is_active', true)
          .gt('coins', myCoins),
        supabase
          .from('siswa')
          .select('nis', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('coins', myCoins)
          .lt('nama', myName),
      ]);

      position = (higherResult.count ?? 0) + (tieBeforeResult.count ?? 0) + 1;
    }

    return {
      position,
      totalSiswa,
      top: topRows.map((row: any, index: number) =>
        this.mapLeaderboardRow(row, index + 1, nis),
      ),
      me: meRow
        ? {
          coins: Number(meRow.coins ?? 0),
          streak: Number(meRow.streak ?? 0),
          kelas: this.formatKelasFromRelation(meRow.kelas),
        }
        : undefined,
    };
  }

  private async getSiswaProfile(nis: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('siswa').select('nis, nama, coins, streak, foto_url, kelas:kelas_id (nama, tingkat)')
      .eq('nis', nis).maybeSingle();
    if (error || !data) throw new BadRequestException('Siswa tidak ditemukan');
    const kelas = Array.isArray(data.kelas) ? data.kelas[0] : data.kelas;
    const tingkatRoman = kelas ? this.convertToRomanNumeral((kelas as any).tingkat) : '';
    return {
      nis: data.nis, nama: data.nama, coins: (data as any).coins || 0,
      streak: (data as any).streak || 0,
      kelas: kelas ? `${tingkatRoman}-${(kelas as any).nama}` : '-',
      foto_url: (data as any).foto_url ?? null,
    };
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

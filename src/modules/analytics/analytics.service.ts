import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

// ─── PERIOD HELPER ────────────────────────────────────────────────────────────
export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let num = n;
  let out = '';
  for (const [value, symbol] of map) {
    while (num >= value) {
      out += symbol;
      num -= value;
    }
  }
  return out;
}

function formatTingkat(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const raw = String(value).trim();
  if (!raw) return '-';

  const num = Number(raw);
  if (Number.isInteger(num) && num > 0) return toRoman(num);

  return raw.toUpperCase();
}

function getDateRange(period: AnalyticsPeriod, customStart?: string, customEnd?: string): DateRange {
  const now   = new Date();
  const today = toLocalDateString(now);
  if (period === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
  switch (period) {
    case 'today': return { start: today, end: today };
    case 'week': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { start: toLocalDateString(d), end: today };
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toLocalDateString(d), end: today };
    }
    case 'year': {
      return { start: `${now.getFullYear()}-01-01`, end: today };
    }
    default: return { start: today, end: today };
  }
}

// ─── RESPONSE TYPES ───────────────────────────────────────────────────────────

export interface StatCard {
  key: string;
  label: string;
  value: number;
  valueFormatted: string;
  change: number;         // % change vs previous period
  changeText: string;
  negative: boolean;      // true = merah (makin besar makin buruk, e.g. pelanggaran)
  sparkline: number[];    // 7 titik data untuk mini chart
  unit: string;
}

export interface TrendPoint {
  date: string;           // label sumbu X
  transaksi: number;
  kemasanPlastik: number;
  kemasanKertas: number;
  pelanggaran: number;
  siswaAktif: number;
}

export interface HeatmapCell {
  day: number;   // 0=Senin ... 6=Minggu
  hour: number;  // 0-23
  count: number;
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface RankingItem {
  rank: number;
  id: string;
  name: string;
  sub: string;            // kelas / jabatan
  value: number;
  valueLabel: string;
  avatarInitials: string;
}

export interface ClassProgress {
  id: number;
  name: string;
  tingkat: string;
  kepatuhanPct: number;
  totalSiswa: number;
  pelanggar: number;
  coinsRata: number;
}

export interface AnalyticsResponse {
  period: AnalyticsPeriod;
  range: DateRange;
  stats: StatCard[];
  trend: TrendPoint[];
  heatmapPelanggaran: HeatmapCell[];
  heatmapLogin: HeatmapCell[];
  donutMetodeBayar: DonutSlice[];
  donutKemasan: DonutSlice[];
  topSiswa: RankingItem[];
  topSiswaLogin: RankingItem[];
  topProduk: RankingItem[];
  progressKelas: ClassProgress[];
  lastUpdated: string;
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(private supabaseService: SupabaseService) {}

  // ── Helper: format angka ──────────────────────────────────────────────────
  private fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}rb`;
    return String(n);
  }

  private fmtRupiah(n: number): string {
    return `Rp ${n.toLocaleString('id-ID')}`;
  }

  // ── Helper: hitung previous period ───────────────────────────────────────
  private getPrevRange(range: DateRange): DateRange {
    const start  = new Date(range.start);
    const end    = new Date(range.end);
    const days   = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const pEnd   = new Date(start); pEnd.setDate(pEnd.getDate() - 1);
    const pStart = new Date(pEnd);  pStart.setDate(pStart.getDate() - days + 1);
    return {
      start: toLocalDateString(pStart),
      end:   toLocalDateString(pEnd),
    };
  }

  private pctChange(cur: number, prev: number): number {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  }

  // ── Main analytics ────────────────────────────────────────────────────────
  async getAnalytics(
    period: AnalyticsPeriod,
    customStart?: string,
    customEnd?: string,
  ): Promise<AnalyticsResponse> {
    const supabase  = this.supabaseService.getClient();
    const range     = getDateRange(period, customStart, customEnd);
    const prevRange = this.getPrevRange(range);

    const startTs     = `${range.start}T00:00:00`;
    const endTs       = `${range.end}T23:59:59`;
    const prevStartTs = `${prevRange.start}T00:00:00`;
    const prevEndTs   = `${prevRange.end}T23:59:59`;

    // ── Parallel fetch ────────────────────────────────────────────────────
    const [
      { data: txCur  }, { data: txPrev  },
      { data: siswaRows },
      { data: pelCur  }, { data: pelPrev },
      { data: vouCur  }, { data: vouPrev },
      { data: detailRows },
      { data: kelasRows },
      { data: siswaAllRows },
    ] = await Promise.all([
      // Transaksi periode ini
      supabase.from('transaksi').select('id,total_bayar,coins_used,payment_method,created_at').gte('created_at', startTs).lte('created_at', endTs),
      // Transaksi periode lalu
      supabase.from('transaksi').select('id,total_bayar').gte('created_at', prevStartTs).lte('created_at', prevEndTs),
      // Semua siswa aktif
      supabase.from('siswa').select('nis,nama,kelas_id,coins,streak,is_active').eq('is_active', true),
      // Pelanggaran periode ini
      supabase.from('pelanggaran').select('id,coins_penalty,created_at').gte('created_at', startTs).lte('created_at', endTs),
      // Pelanggaran periode lalu
      supabase.from('pelanggaran').select('id').gte('created_at', prevStartTs).lte('created_at', prevEndTs),
      // Voucher digunakan periode ini
      supabase.from('voucher').select('id').eq('status', 'used').gte('used_at', startTs).lte('used_at', endTs),
      // Voucher digunakan periode lalu
      supabase.from('voucher').select('id').eq('status', 'used').gte('used_at', prevStartTs).lte('used_at', prevEndTs),
      // Detail produk untuk top ranking
      supabase.from('detail_transaksi')
        .select('nama_produk,quantity,produk_id,transaksi:transaksi_id(created_at)')
        .gte('transaksi.created_at', startTs).lte('transaksi.created_at', endTs),
      // Kelas
      supabase.from('kelas').select('id,nama,tingkat'),
      // Semua siswa lengkap
      supabase.from('siswa').select('nis,nama,kelas_id,coins,streak,is_active').eq('is_active', true).order('coins', { ascending: false }),
    ]);

    // ── STAT CARDS ────────────────────────────────────────────────────────

    const curTx      = txCur ?? [];
    const prevTx     = txPrev ?? [];
    const allSiswa   = siswaRows ?? [];
    const curPel     = pelCur ?? [];
    const prevPel    = pelPrev ?? [];
    const curVou     = vouCur ?? [];
    const prevVou    = vouPrev ?? [];

    const totalPendapatan     = curTx.reduce((s: number, t: any)  => s + (t.total_bayar ?? 0), 0);
    const prevPendapatan      = prevTx.reduce((s: number, t: any) => s + (t.total_bayar ?? 0), 0);
    const totalCoinsDisalurkan = curTx.reduce((s: number, t: any) => s + (t.coins_used  ?? 0), 0);
    const totalPelanggaran    = curPel.length;
    const totalVoucher        = curVou.length;
    const totalSiswaAktif     = allSiswa.filter((s: any) => s.is_active).length;
    const rataCoins           = allSiswa.length > 0
      ? Math.round(allSiswa.reduce((s: number, r: any) => s + (r.coins ?? 0), 0) / allSiswa.length)
      : 0;

    // Sparkline: 7-day daily counts
    const sparklineTx  = await this.getSparkline(supabase, 'transaksi', 'id', 'created_at', 7);
    const sparklinePel = await this.getSparkline(supabase, 'pelanggaran', 'id', 'created_at', 7);

    const stats: StatCard[] = [
      {
        key: 'pendapatan', label: 'Total Pendapatan', value: totalPendapatan,
        valueFormatted: this.fmtRupiah(totalPendapatan),
        change: this.pctChange(totalPendapatan, prevPendapatan),
        changeText: `${Math.abs(this.pctChange(totalPendapatan, prevPendapatan))}% vs periode lalu`,
        negative: false, sparkline: sparklineTx, unit: 'Rp',
      },
      {
        key: 'transaksi', label: 'Total Transaksi', value: curTx.length,
        valueFormatted: this.fmt(curTx.length),
        change: this.pctChange(curTx.length, prevTx.length),
        changeText: `${Math.abs(this.pctChange(curTx.length, prevTx.length))}% vs periode lalu`,
        negative: false, sparkline: sparklineTx, unit: 'trx',
      },
      {
        key: 'siswa', label: 'Siswa Aktif', value: totalSiswaAktif,
        valueFormatted: this.fmt(totalSiswaAktif),
        change: 0, changeText: 'Total terdaftar',
        negative: false, sparkline: Array(7).fill(totalSiswaAktif), unit: 'siswa',
      },
      {
        key: 'coins', label: 'Rata-rata Koin', value: rataCoins,
        valueFormatted: this.fmt(rataCoins),
        change: 0, changeText: 'per siswa aktif',
        negative: false, sparkline: Array(7).fill(rataCoins), unit: '🪙',
      },
      {
        key: 'pelanggaran', label: 'Pelanggaran', value: totalPelanggaran,
        valueFormatted: this.fmt(totalPelanggaran),
        change: this.pctChange(totalPelanggaran, prevPel.length),
        changeText: `${Math.abs(this.pctChange(totalPelanggaran, prevPel.length))}% vs periode lalu`,
        negative: true, sparkline: sparklinePel, unit: 'kasus',
      },
      {
        key: 'voucher', label: 'Voucher Dipakai', value: totalVoucher,
        valueFormatted: this.fmt(totalVoucher),
        change: this.pctChange(totalVoucher, prevVou.length),
        changeText: `${Math.abs(this.pctChange(totalVoucher, prevVou.length))}% vs periode lalu`,
        negative: false, sparkline: sparklineTx, unit: 'voucher',
      },
    ];

    // ── TREND DATA ────────────────────────────────────────────────────────
    const trend = await this.buildTrend(supabase, range, totalSiswaAktif);

    // ── HEATMAP PELANGGARAN (hari × jam) ────────────────────────────────────
    const heatGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
    curPel.forEach((p: any) => {
      const dt   = new Date(p.created_at);
      const hour = dt.getHours();
      const day  = (dt.getDay() + 6) % 7; // convert: Mon=0 ... Sun=6
      heatGrid[day][hour] += 1;
    });
    const heatmapPelanggaran = heatGrid.flatMap((row, day) =>
      row.map((count, hour) => ({ day, hour, count })),
    );

    const kelasMap: Record<number, string> = {};
    (kelasRows ?? []).forEach((k: any) => {
      kelasMap[k.id] = `${formatTingkat(k.tingkat)} ${k.nama}`;
    });

    const { heatmapLogin, topSiswaLogin } = await this.buildLoginAnalytics(
      supabase,
      range,
      kelasMap,
    );

    // ── DONUT: Metode Bayar ────────────────────────────────────────────────
    const methodCount: Record<string, number> = { tunai: 0, voucher: 0, coins: 0 };
    curTx.forEach((t: any) => {
      // pembayaran utama (tunai / voucher)
      const pm = t.payment_method;
      if (pm === 'voucher') methodCount.voucher += 1;
      else methodCount.tunai += 1;

      // catat penggunaan koin meskipun payment_method bukan 'coins'
      if ((t.coins_used ?? 0) > 0) methodCount.coins += 1;
    });
    const donutMetodeBayar: DonutSlice[] = [
      { name: 'Tunai',   value: methodCount.tunai   ?? 0, color: '#10b981' },
      { name: 'Voucher', value: methodCount.voucher ?? 0, color: '#8B5CF6' },
      { name: 'Koin',    value: methodCount.coins   ?? 0, color: '#F59E0B' },
    ].filter(d => d.value > 0);

    // ── DONUT: Kemasan (dari detail produk + produk table) ────────────────
    const donutKemasan = await this.getDonutKemasan(supabase, range);

    // ── TOP SISWA ─────────────────────────────────────────────────────────
    const topSiswa: RankingItem[] = (siswaAllRows ?? [])
      .slice(0, 8)
      .map((s: any, i: number) => ({
        rank:           i + 1,
        id:             s.nis,
        name:           s.nama,
        sub:            kelasMap[s.kelas_id] ?? '-',
        value:          s.coins ?? 0,
        valueLabel:     `${(s.coins ?? 0).toLocaleString('id-ID')} koin`,
        avatarInitials: s.nama?.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase() ?? '??',
      }));

    // ── TOP PRODUK ────────────────────────────────────────────────────────
    const produkMap: Record<string, number> = {};
    (detailRows ?? []).forEach((d: any) => {
      produkMap[d.nama_produk] = (produkMap[d.nama_produk] ?? 0) + (d.quantity ?? 1);
    });
    const topProduk: RankingItem[] = Object.entries(produkMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([nama, qty], i) => ({
        rank: i + 1, id: nama, name: nama, sub: 'unit terjual',
        value: qty, valueLabel: `${qty} unit`,
        avatarInitials: nama.slice(0, 2).toUpperCase(),
      }));

    // ── PROGRESS KELAS ────────────────────────────────────────────────────
    const progressKelas = await this.buildProgressKelas(supabase, kelasRows ?? [], allSiswa, range);

    return {
      period, range, stats, trend,
      heatmapPelanggaran, heatmapLogin,
      donutMetodeBayar, donutKemasan,
      topSiswa, topSiswaLogin, topProduk, progressKelas,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ── Sparkline: daily count for last N days ────────────────────────────────
  private async getSparkline(
    supabase: any, table: string, countCol: string, dateCol: string, days: number,
  ): Promise<number[]> {
    const queries = Array.from({ length: days }, (_, index) => {
      const offset = days - 1 - index;
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const date = toLocalDateString(d);

      return supabase
        .from(table)
        .select(countCol, { count: 'exact', head: true })
        .gte(dateCol, `${date}T00:00:00`)
        .lte(dateCol, `${date}T23:59:59`);
    });

    const results = await Promise.all(queries);
    return results.map(({ count }) => count ?? 0);
  }

  // ── Trend: daily/weekly breakdown ────────────────────────────────────────
  private async buildTrend(
    supabase: any,
    range: DateRange,
    totalSiswaAktif: number,
  ): Promise<TrendPoint[]> {
    const start = new Date(range.start);
    const end   = new Date(range.end);
    const days  = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

    // Kalau > 60 hari → aggregate per minggu
    const points: TrendPoint[] = [];
    const step = days > 60 ? 7 : 1;

    const [
      { data: txRows },
      { data: pelRows },
      { data: detRows },
    ] = await Promise.all([
      supabase
        .from('transaksi')
        .select('created_at,coins_used')
        .gte('created_at', `${range.start}T00:00:00`)
        .lte('created_at', `${range.end}T23:59:59`),
      supabase
        .from('pelanggaran')
        .select('created_at')
        .gte('created_at', `${range.start}T00:00:00`)
        .lte('created_at', `${range.end}T23:59:59`),
      supabase
        .from('detail_transaksi')
        .select('quantity,produk:produk_id(jenis_kemasan),transaksi:transaksi_id(created_at)')
        .gte('transaksi.created_at', `${range.start}T00:00:00`)
        .lte('transaksi.created_at', `${range.end}T23:59:59`),
    ]);

    const transaksiRows = txRows ?? [];
    const pelanggaranRows = pelRows ?? [];
    const detailRows = detRows ?? [];

    for (let i = 0; i < days; i += step) {
      const d      = new Date(start); d.setDate(d.getDate() + i);
      const dEnd   = new Date(d); dEnd.setDate(dEnd.getDate() + step - 1);
      const ds     = toLocalDateString(d);
      const de     = toLocalDateString(dEnd);

      const startWindow = new Date(`${ds}T00:00:00`).getTime();
      const endWindow = new Date(`${de}T23:59:59`).getTime();

      const txDay = transaksiRows.filter((tx: any) => {
        const ts = new Date(tx.created_at).getTime();
        return ts >= startWindow && ts <= endWindow;
      });

      const pelDay = pelanggaranRows.filter((pel: any) => {
        const ts = new Date(pel.created_at).getTime();
        return ts >= startWindow && ts <= endWindow;
      });

      const kemasanDay = detailRows
        .filter((det: any) => {
          const ts = new Date(det.transaksi?.created_at ?? det.created_at).getTime();
          const jenis = det.produk?.jenis_kemasan;
          return ts >= startWindow && ts <= endWindow && (jenis === 'plastik' || jenis === 'kertas');
        });

      const kemasanPlastik = kemasanDay
        .filter((det: any) => det.produk?.jenis_kemasan === 'plastik')
        .reduce((sum: number, det: any) => sum + (det.quantity ?? 1), 0);

      const kemasanKertas = kemasanDay
        .filter((det: any) => det.produk?.jenis_kemasan === 'kertas')
        .reduce((sum: number, det: any) => sum + (det.quantity ?? 1), 0);

      const label = step === 1
        ? new Date(ds).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : `${new Date(ds).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;

      points.push({
        date:         label,
        transaksi:    txDay.length,
        kemasanPlastik,
        kemasanKertas,
        pelanggaran:  pelDay.length,
        siswaAktif:   totalSiswaAktif,
      });
    }
    return points;
  }

  // ── Donut Kemasan ─────────────────────────────────────────────────────────
  private async getDonutKemasan(supabase: any, range: DateRange): Promise<DonutSlice[]> {
    const { data: produkRows } = await supabase
      .from('produk').select('id,jenis_kemasan');
    const kemasanMap: Record<number, string> = {};
    (produkRows ?? []).forEach((p: any) => { kemasanMap[p.id] = p.jenis_kemasan ?? 'tanpa_kemasan'; });

    const { data: detRows } = await supabase
      .from('detail_transaksi')
      .select('produk_id,quantity,transaksi:transaksi_id(created_at)')
      .gte('transaksi.created_at', `${range.start}T00:00:00`)
      .lte('transaksi.created_at', `${range.end}T23:59:59`);

    const counts: Record<string, number> = {};
    (detRows ?? []).forEach((d: any) => {
      const k = kemasanMap[d.produk_id] ?? 'tanpa_kemasan';
      counts[k] = (counts[k] ?? 0) + (d.quantity ?? 1);
    });

    const colorMap: Record<string, string> = {
      plastik:       '#EF4444',
      kertas:        '#F59E0B',
      tanpa_kemasan: '#10b981',
    };
    const labelMap: Record<string, string> = {
      plastik: 'Plastik', kertas: 'Kertas', tanpa_kemasan: 'Tanpa Kemasan',
    };
    return Object.entries(counts).map(([k, v]) => ({
      name:  labelMap[k] ?? k,
      value: v,
      color: colorMap[k] ?? '#64748b',
    }));
  }

  // ── Progress per Kelas ────────────────────────────────────────────────────
  private async buildProgressKelas(
    supabase: any,
    kelasRows: any[],
    allSiswa: any[],
    range: DateRange,
  ): Promise<ClassProgress[]> {
    const { data: pelRows } = await supabase
      .from('pelanggaran').select('nis,created_at')
      .gte('created_at', `${range.start}T00:00:00`)
      .lte('created_at', `${range.end}T23:59:59`);

    const pelByNis: Record<string, number> = {};
    (pelRows ?? []).forEach((p: any) => { pelByNis[p.nis] = (pelByNis[p.nis] ?? 0) + 1; });

    return kelasRows.map((k: any) => {
      const siswaKelas  = allSiswa.filter((s: any) => s.kelas_id === k.id);
      const pelanggar   = siswaKelas.filter((s: any) => pelByNis[s.nis] > 0).length;
      const total       = siswaKelas.length || 1;
      const coinsRata   = siswaKelas.length > 0
        ? Math.round(siswaKelas.reduce((s, r: any) => s + (r.coins ?? 0), 0) / siswaKelas.length)
        : 0;
      return {
        id:           k.id,
        name:         k.nama,
        tingkat:      formatTingkat(k.tingkat),
        kepatuhanPct: Math.round(((total - pelanggar) / total) * 100),
        totalSiswa:   siswaKelas.length,
        pelanggar,
        coinsRata,
      };
    }).sort((a, b) => b.kepatuhanPct - a.kepatuhanPct);
  }

  private async buildLoginAnalytics(
    supabase: any,
    range: DateRange,
    kelasMap: Record<number, string>,
  ): Promise<{ heatmapLogin: HeatmapCell[]; topSiswaLogin: RankingItem[] }> {
    const emptyHeatmap = Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => ({ day, hour, count: 0 })),
    ).flat();

    const { data: loginRows, error } = await supabase
      .from('login_audit_log')
      .select('role, actor_user_id, actor_identifier, actor_name, status, login_at')
      .eq('status', 'success')
      .gte('login_at', `${range.start}T00:00:00`)
      .lte('login_at', `${range.end}T23:59:59`);

    if (error) {
      console.warn('[AnalyticsService] Login audit analytics dilewati:', error.message);
      return { heatmapLogin: emptyHeatmap, topSiswaLogin: [] };
    }

    const siswaIds = Array.from(
      new Set(
        (loginRows ?? [])
          .filter((row: any) => row.role === 'siswa' && row.actor_user_id)
          .map((row: any) => String(row.actor_user_id)),
      ),
    );

    const siswaKelasMap = new Map<string, number | null>();
    if (siswaIds.length > 0) {
      const { data: siswaRows } = await supabase
        .from('siswa')
        .select('nis, kelas_id')
        .in('nis', siswaIds);

      (siswaRows ?? []).forEach((row: any) => {
        siswaKelasMap.set(String(row.nis), row.kelas_id != null ? Number(row.kelas_id) : null);
      });
    }

    const heatmapBuckets = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => new Set<string>()),
    );

    const siswaLoginMap = new Map<
      string,
      { count: number; name: string; kelasId: number | null }
    >();

    (loginRows ?? []).forEach((row: any) => {
      const loginAt = row?.login_at ? new Date(row.login_at) : null;
      if (!loginAt || Number.isNaN(loginAt.getTime())) return;

      const day = (loginAt.getDay() + 6) % 7;
      const hour = loginAt.getHours();
      const actorKey = String(row.actor_user_id ?? row.actor_identifier ?? '').trim();
      if (!actorKey) return;

      heatmapBuckets[day][hour].add(actorKey);

      if (row.role !== 'siswa') return;

      const prev = siswaLoginMap.get(actorKey);
      const kelasId = siswaKelasMap.get(actorKey) ?? null;
      siswaLoginMap.set(actorKey, {
        count: (prev?.count ?? 0) + 1,
        name: row.actor_name ?? row.actor_identifier ?? actorKey,
        kelasId: prev?.kelasId ?? kelasId,
      });
    });

    const heatmapLogin = heatmapBuckets.flatMap((row, day) =>
      row.map((bucket, hour) => ({
        day,
        hour,
        count: bucket.size,
      })),
    );

    const topSiswaLogin: RankingItem[] = Array.from(siswaLoginMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([id, item], index) => ({
        rank: index + 1,
        id,
        name: item.name,
        sub: item.kelasId != null ? (kelasMap[item.kelasId] ?? '-') : '-',
        value: item.count,
        valueLabel: `${item.count.toLocaleString('id-ID')} login`,
        avatarInitials:
          item.name
            ?.split(' ')
            .slice(0, 2)
            .map((part: string) => part[0])
            .join('')
            .toUpperCase() ?? '??',
      }));

    return { heatmapLogin, topSiswaLogin };
  }
}

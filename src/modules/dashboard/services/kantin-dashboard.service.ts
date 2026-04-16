import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { RequestCache } from 'src/common/utils/request-cache';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface KantinStatHarian {
  totalPendapatan: number;
  totalTransaksi: number;
  totalItemTerjual: number;
  coinsDigunakan: number;
  rataRataPerTransaksi: number;
}

export interface KantinStatMingguan {
  totalPendapatan: number;
  totalTransaksi: number;
  chartHarian: {
    tanggal: string;
    label: string;
    pendapatan: number;
    transaksi: number;
  }[];
}

export interface ProdukTerlaris {
  produkId: number;
  nama: string;
  totalTerjual: number;
  totalPendapatan: number;
  stokSaat: number;
  kategori: string;
  jenisKemasan: string | null;
}

export interface TransaksiTerbaru {
  id: number;
  kodeTransaksi: string;
  namaSiswa: string;
  nis: string;
  totalBayar: number;
  coinsUsed: number;
  paymentMethod: string;
  createdAt: string;
  jumlahItem: number;
}

export interface ProdukStokRendah {
  id: number;
  nama: string;
  stok: number;
  kategori: string;
}

export interface KantinDashboardResponse {
  statHarian:       KantinStatHarian;
  statMingguan:     KantinStatMingguan;
  produkTerlaris:   ProdukTerlaris[];
  transaksiTerbaru: TransaksiTerbaru[];
  stokRendah:       ProdukStokRendah[];
  kantinNama:       string;
  totalPiutang:     number;
}

@Injectable()
export class KantinDashboardService {
  private static readonly DASHBOARD_CACHE_TTL_MS = 15_000;
  private static readonly DASHBOARD_STALE_TTL_MS = 60_000;

  constructor(private supabaseService: SupabaseService) {}

  async getDashboard(kantinId: number): Promise<KantinDashboardResponse> {
    return RequestCache.getOrSet(
      `dashboard:kantin:${Number(kantinId)}`,
      KantinDashboardService.DASHBOARD_CACHE_TTL_MS,
      async () => {
        const supabase = this.supabaseService.getClient();
        const idNum = Number(kantinId);

    // ── Tanggal helpers ───────────────────────────────────────────────────
    const now               = new Date();
    const todayStr          = now.toISOString().split('T')[0];
    const hariIni           = `${todayStr}T00:00:00`;
    const hariIniBatas      = `${todayStr}T23:59:59`;

    const tujuhHariLalu     = new Date(now);
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 6);
    const mingguStr         = tujuhHariLalu.toISOString().split('T')[0] + 'T00:00:00';

    const tigaPuluhHariLalu = new Date(now);
    tigaPuluhHariLalu.setDate(tigaPuluhHariLalu.getDate() - 30);
    const bulanStr          = tigaPuluhHariLalu.toISOString().split('T')[0] + 'T00:00:00';

    // ── 1. Nama kantin ────────────────────────────────────────────────────
    // users: id (bigint), nama (varchar), role CHECK('admin','kantin')
    const { data: kantinRow } = await supabase
      .from('users')
      .select('nama')
      .eq('id', idNum)
      .eq('role', 'kantin')
      .maybeSingle();
    const kantinNama = kantinRow?.nama ?? 'Kantin';

    // ── 2. Stat harian ────────────────────────────────────────────────────
    // transaksi: id, kantin_id, total_bayar, coins_used, created_at
    const { data: txHarian } = await supabase
      .from('transaksi')
      .select('id, total_bayar, coins_used')
      .eq('kantin_id', idNum)
      .gte('created_at', hariIni)
      .lte('created_at', hariIniBatas);

    const listH            = txHarian ?? [];
    const idsTxH           = listH.map((t) => t.id);
    const totalPendH       = listH.reduce((s, t) => s + (t.total_bayar ?? 0), 0);
    const totalCoinsH      = listH.reduce((s, t) => s + (t.coins_used  ?? 0), 0);

    // detail_transaksi: transaksi_id, quantity
    let totalItemH = 0;
    if (idsTxH.length > 0) {
      const { data: detH } = await supabase
        .from('detail_transaksi')
        .select('quantity')
        .in('transaksi_id', idsTxH);
      totalItemH = (detH ?? []).reduce((s, d) => s + (d.quantity ?? 0), 0);
    }

    const statHarian: KantinStatHarian = {
      totalPendapatan:      totalPendH,
      totalTransaksi:       listH.length,
      totalItemTerjual:     totalItemH,
      coinsDigunakan:       totalCoinsH,
      rataRataPerTransaksi: listH.length > 0 ? Math.round(totalPendH / listH.length) : 0,
    };

    // ── 3. Chart 7 hari ───────────────────────────────────────────────────
    const { data: txMinggu } = await supabase
      .from('transaksi')
      .select('total_bayar, created_at')
      .eq('kantin_id', idNum)
      .gte('created_at', mingguStr);

    const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const chartMap: Record<string, { pendapatan: number; transaksi: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      chartMap[d.toISOString().split('T')[0]] = { pendapatan: 0, transaksi: 0 };
    }
    (txMinggu ?? []).forEach((t) => {
      const key = (t.created_at ?? '').split('T')[0];
      if (chartMap[key]) {
        chartMap[key].pendapatan += t.total_bayar ?? 0;
        chartMap[key].transaksi  += 1;
      }
    });

    const chartHarian = Object.entries(chartMap).map(([tanggal, v]) => ({
      tanggal,
      label: HARI[new Date(tanggal + 'T12:00:00').getDay()],
      ...v,
    }));

    const listM = txMinggu ?? [];
    const statMingguan: KantinStatMingguan = {
      totalPendapatan: listM.reduce((s, t) => s + (t.total_bayar ?? 0), 0),
      totalTransaksi:  listM.length,
      chartHarian,
    };

    // ── 4. Produk terlaris 30 hari ────────────────────────────────────────
    // Catatan: produk bersifat GLOBAL (tidak ada fk kantin_id di tabel produk).
    // Kita ambil produk yang terjual lewat transaksi kantin ini.
    //
    // transaksi → detail_transaksi: produk_id, nama_produk, quantity, subtotal
    // detail_transaksi → produk: id, stok, kategori, jenis_kemasan
    const { data: idsTx30Rows } = await supabase
      .from('transaksi')
      .select('id')
      .eq('kantin_id', idNum)
      .gte('created_at', bulanStr);

    let produkTerlaris: ProdukTerlaris[] = [];

    if ((idsTx30Rows ?? []).length > 0) {
      const ids30 = (idsTx30Rows ?? []).map((t) => t.id);

      const { data: detBulan } = await supabase
        .from('detail_transaksi')
        .select(`
          produk_id, nama_produk, quantity, subtotal,
          produk:produk_id (stok, kategori, jenis_kemasan)
        `)
        .in('transaksi_id', ids30);

      const pMap: Record<number, ProdukTerlaris> = {};
      (detBulan ?? []).forEach((d: any) => {
        const pid = d.produk_id;
        if (!pMap[pid]) {
          const p = Array.isArray(d.produk) ? d.produk[0] : d.produk;
          pMap[pid] = {
            produkId:        pid,
            nama:            d.nama_produk    ?? '-',
            totalTerjual:    0,
            totalPendapatan: 0,
            stokSaat:        p?.stok          ?? 0,
            kategori:        p?.kategori      ?? '-',
            jenisKemasan:    p?.jenis_kemasan ?? null,
          };
        }
        pMap[pid].totalTerjual    += d.quantity ?? 0;
        pMap[pid].totalPendapatan += d.subtotal ?? 0;
      });

      produkTerlaris = Object.values(pMap)
        .sort((a, b) => b.totalTerjual - a.totalTerjual)
        .slice(0, 5);
    }

    // ── 5. Transaksi terbaru ──────────────────────────────────────────────
    const { data: txTerbaru } = await supabase
      .from('transaksi')
      .select('id, kode_transaksi, nis, total_bayar, coins_used, payment_method, created_at')
      .eq('kantin_id', idNum)
      .order('created_at', { ascending: false })
      .limit(8);

    const listTxT = txTerbaru ?? [];

    // Nama siswa — siswa: nis (varchar PK), nama
    const nisList = [...new Set(listTxT.map((t) => t.nis))];
    const siswaMap: Record<string, string> = {};
    if (nisList.length > 0) {
      const { data: siswaRows } = await supabase
        .from('siswa')
        .select('nis, nama')
        .in('nis', nisList);
      (siswaRows ?? []).forEach((s) => { siswaMap[s.nis] = s.nama; });
    }

    // Jumlah item per transaksi
    const idsT = listTxT.map((t) => t.id);
    const itemMap: Record<number, number> = {};
    if (idsT.length > 0) {
      const { data: detCount } = await supabase
        .from('detail_transaksi')
        .select('transaksi_id, quantity')
        .in('transaksi_id', idsT);
      (detCount ?? []).forEach((d: any) => {
        itemMap[d.transaksi_id] = (itemMap[d.transaksi_id] ?? 0) + (d.quantity ?? 0);
      });
    }

    const transaksiTerbaru: TransaksiTerbaru[] = listTxT.map((t) => ({
      id:            t.id,
      kodeTransaksi: t.kode_transaksi,
      namaSiswa:     siswaMap[t.nis] ?? t.nis,
      nis:           t.nis,
      totalBayar:    t.total_bayar   ?? 0,
      coinsUsed:     t.coins_used    ?? 0,
      paymentMethod: t.payment_method,
      createdAt:     t.created_at,
      jumlahItem:    itemMap[t.id]   ?? 0,
    }));

    // ── 6. Stok rendah ────────────────────────────────────────────────────
    // Produk global — prioritaskan produk yang dijual oleh kantin ini.
    // produk: id, nama, stok, kategori, is_active
    let stokRendah: ProdukStokRendah[] = [];

    // ── 7. Total Piutang (Utang Belum Bayar) ──────────────────────────────
    const { data: utangRows } = await supabase
      .from('transaksi')
      .select('total_bayar, nominal_dibayar')
      .eq('kantin_id', idNum)
      .eq('status_pembayaran', 'kasbon');
      
    const totalPiutang = (utangRows ?? []).reduce((sum, t) => sum + ((t.total_bayar ?? 0) - (t.nominal_dibayar ?? 0)), 0);

    if (produkTerlaris.length > 0) {
      const pIds = produkTerlaris.map((p) => p.produkId);
      const { data: stokRows } = await supabase
        .from('produk')
        .select('id, nama, stok, kategori')
        .in('id', pIds)
        .lte('stok', 10)
        .eq('is_active', true)
        .order('stok', { ascending: true })
        .limit(5);
      stokRendah = (stokRows ?? []).map((p) => ({
        id: p.id, nama: p.nama, stok: p.stok, kategori: p.kategori,
      }));
    }

    // Fallback: semua produk aktif stok rendah
    if (stokRendah.length === 0) {
      const { data: stokRows } = await supabase
        .from('produk')
        .select('id, nama, stok, kategori')
        .lte('stok', 10)
        .eq('is_active', true)
        .order('stok', { ascending: true })
        .limit(5);
      stokRendah = (stokRows ?? []).map((p) => ({
        id: p.id, nama: p.nama, stok: p.stok, kategori: p.kategori,
      }));
    }

        return {
          statHarian,
          statMingguan,
          produkTerlaris,
          transaksiTerbaru,
          stokRendah,
          kantinNama,
          totalPiutang,
        };
      },
      {
        staleTtlMs: KantinDashboardService.DASHBOARD_STALE_TTL_MS,
        onError: (error) => {
          console.warn('[KantinDashboardService] Falling back to stale dashboard cache:', error);
        },
      },
    );
  }
}

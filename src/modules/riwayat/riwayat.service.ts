import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

export interface RiwayatTumbler {
  id: string;
  tanggal: string;
  waktu: string;
  createdAt: string;
  coinsReward: number;
  streakBonus: number;
  method: string;
  dicatatOleh: string;
  kelas: string;
}

export interface DetailBelanja {
  namaProduk: string;
  harga: number;
  qty: number;
  subtotal: number;
  jenisKemasan: string;
}

export interface RiwayatBelanja {
  id: string;
  kodeTransaksi: string;
  tanggal: string;
  waktu: string;
  createdAt: string;
  totalHarga: number;
  totalDiskon: number;
  totalBayar: number;
  coinsUsed: number;
  coinsReward: number;
  coinsPenalty: number;
  paymentMethod: string;
  isByoc: boolean;           // ← tambah field ini
  items: DetailBelanja[];
  adaProdukPlastik: boolean;
  jumlahItemPlastik: number;
  dicatatOleh: string;
  verifiedAt: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RiwayatPelanggaran {
  id: number;
  tanggal: string;
  waktu: string;
  createdAt: string;
  namaJenis: string;
  kategori: 'ringan' | 'sedang' | 'berat';
  coinsPenalty: number;
  catatan: string | null;
  buktiUrl: string | null;
  dicatatOleh: string;
  verifiedAt: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RiwayatSummary {
  totalTumbler: number;
  totalBelanja: number;
  totalPelanggaran: number;
  totalCoinsDidapat: number;
  totalCoinsKeluar: number;
  jumlahPlastik: number;      // plastik NON-BYOC
  jumlahPlastikByoc: number;  // plastik BYOC (bawa wadah sendiri)
}

@Injectable()
export class RiwayatService {
  constructor(private supabaseService: SupabaseService) { }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  async getSummary(nis: string): Promise<RiwayatSummary> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    const [tumblerRes, belanjaRes, pelanggaranRes] = await Promise.all([
      supabase
        .from('absensi_tumbler')
        .select('coins_reward, streak_bonus')
        .eq('nis', nisStr),
      supabase
        .from('transaksi')
        .select('id, coins_used, coins_reward, coins_penalty, is_byoc')
        .eq('nis', nisStr),
      supabase
        .from('pelanggaran')
        .select('coins_penalty')
        .eq('nis', nisStr)
        .eq('status', 'approved'),
    ]);

    const tumblerRows: any[] = (tumblerRes.data ?? []) as any[];
    const belanjaRows: any[] = (belanjaRes.data ?? []) as any[];
    const pelanggaranRows: any[] = (pelanggaranRes.data ?? []) as any[];

    const totalCoinsDidapat =
      tumblerRows.reduce((s, r) => s + (r.coins_reward ?? 0) + (r.streak_bonus ?? 0), 0) +
      belanjaRows.reduce((s, r) => s + (r.coins_reward ?? 0), 0);

    const totalCoinsKeluar =
      belanjaRows.reduce((s, r) => s + (r.coins_used ?? 0) + Math.abs(r.coins_penalty ?? 0), 0) +
      pelanggaranRows.reduce((s, r) => s + Math.abs(r.coins_penalty ?? 0), 0);

    // Ambil detail produk — sekarang juga ambil is_byoc dari transaksi
    let jumlahPlastik = 0;
    let jumlahPlastikByoc = 0;

    const transaksiIds = belanjaRows.map((t) => t.id).filter(Boolean);
    if (transaksiIds.length > 0) {
      // Step 1: ambil detail_transaksi — hanya kolom yang ada di tabel ini
      const { data: detailRows } = await supabase
        .from('detail_transaksi')
        .select('transaksi_id, produk_id, quantity')
        .in('transaksi_id', transaksiIds);

      const details: any[] = detailRows ?? [];

      // Step 2: ambil jenis_kemasan dari tabel produk secara terpisah
      const produkIds = [...new Set(details.map((d) => String(d.produk_id)).filter(Boolean))];
      const produkJenisMap = new Map<string, string>(); // produk_id → jenis_kemasan

      if (produkIds.length > 0) {
        const { data: produkRows } = await supabase
          .from('produk')
          .select('id, jenis_kemasan')
          .in('id', produkIds);

        (produkRows ?? []).forEach((p: any) => {
          produkJenisMap.set(String(p.id), p.jenis_kemasan ?? 'tanpa_kemasan');
        });
      }

      // Step 3: map transaksi_id → is_byoc dari belanjaRows
      const byocMap = new Map<string, boolean>(
        belanjaRows.map((t) => [String(t.id), Boolean(t.is_byoc)]),
      );

      // Step 4: hitung plastik, pisahkan BYOC vs non-BYOC
      details.forEach((d: any) => {
        const jenis = produkJenisMap.get(String(d.produk_id)) ?? 'tanpa_kemasan';
        if (jenis !== 'plastik') return;

        const isByoc = byocMap.get(String(d.transaksi_id)) ?? false;
        const qty = d.quantity ?? 1;

        if (isByoc) {
          jumlahPlastikByoc += qty; // pakai wadah sendiri → bukan pelanggaran
        } else {
          jumlahPlastik += qty;     // tidak pakai wadah → pelanggaran
        }
      });
    }

    return {
      totalTumbler: tumblerRows.length,
      totalBelanja: belanjaRows.length,
      totalPelanggaran: pelanggaranRows.length,
      totalCoinsDidapat,
      totalCoinsKeluar,
      jumlahPlastik,      // hanya transaksi NON-BYOC
      jumlahPlastikByoc,  // transaksi BYOC (info saja, bukan pelanggaran)
    };
  }

  // ─── TUMBLER ─────────────────────────────────────────────────────────────
  async getRiwayatTumbler(nis: string, limit = 50): Promise<RiwayatTumbler[]> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    const { data: rawRows, error } = await supabase
      .from('absensi_tumbler')
      .select('id, nip, siswa_nis, tanggal, waktu, coins_reward, streak_bonus, method, created_at')
      .eq('nis', nisStr)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(`Gagal tumbler: ${error.message}`);
    const rows: any[] = (rawRows ?? []) as any[];
    if (rows.length === 0) return [];

    const nips = [...new Set(rows.map((r) => r.nip).filter(Boolean))];
    const siswaNisList = [...new Set(rows.map((r) => r.siswa_nis).filter(Boolean))];
    const guruMap: Record<string, string> = {};
    const siswaMap: Record<string, string> = {};
    if (nips.length > 0) {
      const { data: guruRows } = await supabase
        .from('guru').select('nip, nama').in('nip', nips);
      (guruRows ?? []).forEach((g: any) => { guruMap[String(g.nip)] = g.nama; });
    }
    if (siswaNisList.length > 0) {
      const { data: siswaRows } = await supabase
        .from('siswa').select('nis, nama').in('nis', siswaNisList);
      (siswaRows ?? []).forEach((s: any) => { siswaMap[String(s.nis)] = s.nama; });
    }

    let kelasLabel = '-';
    const { data: siswaData } = await supabase
      .from('siswa')
      .select('kelas:kelas_id (nama, tingkat)')
      .eq('nis', nisStr)
      .maybeSingle();
    if (siswaData?.kelas) {
      const k = Array.isArray(siswaData.kelas) ? siswaData.kelas[0] : siswaData.kelas;
      if (k) kelasLabel = `${(k as any).tingkat} ${(k as any).nama}`;
    }

    return rows.map((r) => ({
      id: String(r.id),
      tanggal: r.tanggal ?? '-',
      waktu: String(r.waktu ?? '00:00:00').substring(0, 8),
      createdAt: r.created_at ?? '-',
      coinsReward: r.coins_reward ?? 0,
      streakBonus: r.streak_bonus ?? 0,
      method: r.method ?? 'manual',
      dicatatOleh: guruMap[String(r.nip)] ?? siswaMap[String(r.siswa_nis)] ?? '-',
      kelas: kelasLabel,
    }));
  }

  // ─── BELANJA ─────────────────────────────────────────────────────────────
  async getRiwayatBelanja(nis: string, limit = 50): Promise<RiwayatBelanja[]> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    const { data: rawTrx, error } = await supabase
      .from('transaksi')
      .select(`
        id, kode_transaksi, created_at,
        total_harga, total_diskon, total_bayar,
        coins_used, payment_method, coins_reward, coins_penalty,
        is_byoc
      `)
      .eq('nis', nisStr)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(`Gagal belanja: ${error.message}`);
    const transaksiRows: any[] = (rawTrx ?? []) as any[];
    if (transaksiRows.length === 0) return [];

    const ids = transaksiRows.map((t) => t.id).filter(Boolean);

    // Step 1: ambil detail_transaksi — kolom yang tersedia di tabel ini
    const { data: rawDetail } = await supabase
      .from('detail_transaksi')
      .select('transaksi_id, produk_id, nama_produk, quantity, harga_satuan, subtotal')
      .in('transaksi_id', ids);

    const allDetails: any[] = rawDetail ?? [];

    // Step 2: ambil jenis_kemasan dari tabel produk secara terpisah
    const produkIds = [...new Set(allDetails.map((d) => String(d.produk_id)).filter(Boolean))];
    const produkJenisMap = new Map<string, string>(); // produk_id → jenis_kemasan

    if (produkIds.length > 0) {
      const { data: produkRows } = await supabase
        .from('produk')
        .select('id, jenis_kemasan')
        .in('id', produkIds);

      (produkRows ?? []).forEach((p: any) => {
        produkJenisMap.set(String(p.id), p.jenis_kemasan ?? 'tanpa_kemasan');
      });
    }

    // Step 3: kelompokkan detail per transaksi
    const detailMap: Record<string, any[]> = {};
    allDetails.forEach((d: any) => {
      if (!detailMap[d.transaksi_id]) detailMap[d.transaksi_id] = [];
      detailMap[d.transaksi_id].push(d);
    });

    return transaksiRows.map((t) => {
      const isByoc = Boolean(t.is_byoc);
      const details = detailMap[t.id] ?? [];

      const items: DetailBelanja[] = details.map((d: any) => ({
        namaProduk: d.nama_produk ?? 'Produk',
        harga: d.harga_satuan ?? 0,
        qty: d.quantity ?? 1,
        subtotal: d.subtotal ?? 0,
        // Ambil jenis_kemasan dari map produk, bukan dari nested join
        jenisKemasan: produkJenisMap.get(String(d.produk_id)) ?? 'tanpa_kemasan',
      }));

      // Plastik hanya dianggap "pelanggaran" jika BUKAN BYOC
      const plastikItems = items.filter((i) => i.jenisKemasan === 'plastik');
      const jumlahItemPlastik = plastikItems.length;
      // adaProdukPlastik = true hanya jika ada plastik DAN bukan BYOC
      const adaProdukPlastik = jumlahItemPlastik > 0 && !isByoc;

      const createdAt = t.created_at ?? '-';
      const tanggal = createdAt !== '-' ? createdAt.split('T')[0] : '-';
      const waktu = createdAt !== '-' && createdAt.includes('T')
        ? createdAt.split('T')[1]?.substring(0, 8) ?? '00:00:00'
        : '00:00:00';

      return {
        id: String(t.id),
        kodeTransaksi: t.kode_transaksi ?? '-',
        tanggal,
        waktu,
        createdAt,
        totalHarga: t.total_harga ?? 0,
        totalDiskon: t.total_diskon ?? 0,
        totalBayar: t.total_bayar ?? 0,
        coinsUsed: t.coins_used ?? 0,
        coinsReward: t.coins_reward ?? 0,
        coinsPenalty: Math.abs(t.coins_penalty ?? 0),
        paymentMethod: t.payment_method ?? '-',
        isByoc,
        items,
        adaProdukPlastik,        // false jika BYOC
        jumlahItemPlastik,
        dicatatOleh: '-',
        verifiedAt: null,
        status: 'approved' as const,
      };
    });
  }

  // ─── PELANGGARAN ─────────────────────────────────────────────────────────
  async getRiwayatPelanggaran(nis: string, limit = 50): Promise<RiwayatPelanggaran[]> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    const { data: rawRows, error } = await supabase
      .from('pelanggaran')
      .select('id, nip, siswa_nis, jenis_pelanggaran_id, tanggal, waktu, created_at, coins_penalty, catatan, bukti_foto_url, verified_at, status')
      .eq('nis', nisStr)
      .eq('status', 'approved')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(`Gagal pelanggaran: ${error.message}`);
    const rows: any[] = (rawRows ?? []) as any[];
    if (rows.length === 0) return [];

    const nips = [...new Set(rows.map((r) => r.nip).filter(Boolean))];
    const siswaNisList = [...new Set(rows.map((r) => r.siswa_nis).filter(Boolean))];
    const guruMap: Record<string, string> = {};
    const siswaMap: Record<string, string> = {};
    if (nips.length > 0) {
      const { data: guruRows } = await supabase
        .from('guru').select('nip, nama').in('nip', nips);
      (guruRows ?? []).forEach((g: any) => { guruMap[String(g.nip)] = g.nama; });
    }
    if (siswaNisList.length > 0) {
      const { data: siswaRows } = await supabase
        .from('siswa').select('nis, nama').in('nis', siswaNisList);
      (siswaRows ?? []).forEach((s: any) => { siswaMap[String(s.nis)] = s.nama; });
    }

    const jenisIds = [...new Set(rows.map((r) => r.jenis_pelanggaran_id).filter(Boolean))];
    const jenisMap: Record<string, { nama: string; kategori: string }> = {};
    if (jenisIds.length > 0) {
      const { data: jenisRows } = await supabase
        .from('jenis_pelanggaran').select('id, nama, kategori').in('id', jenisIds);
      (jenisRows ?? []).forEach((j: any) => {
        jenisMap[j.id] = { nama: j.nama, kategori: j.kategori };
      });
    }

    return rows.map((p) => {
      const jenis = jenisMap[p.jenis_pelanggaran_id];
      return {
        id: p.id,
        tanggal: p.tanggal ?? '-',
        waktu: String(p.waktu ?? '00:00:00').substring(0, 8),
        createdAt: p.created_at ?? '-',
        namaJenis: jenis?.nama ?? '-',
        kategori: (jenis?.kategori ?? 'ringan') as 'ringan' | 'sedang' | 'berat',
        coinsPenalty: Math.abs(p.coins_penalty ?? 0),
        catatan: p.catatan ?? null,
        buktiUrl: p.bukti_foto_url ?? null,
        dicatatOleh: guruMap[String(p.nip)] ?? siswaMap[String(p.siswa_nis)] ?? '-',
        verifiedAt: p.verified_at ?? null,
        status: p.status as 'pending' | 'approved' | 'rejected',
      };
    });
  }

  // ─── ALL IN ONE ───────────────────────────────────────────────────────────
  async getRiwayatAll(nis: string, limit = 50) {
    const [tumbler, belanja, pelanggaran, summary] = await Promise.all([
      this.getRiwayatTumbler(nis, limit),
      this.getRiwayatBelanja(nis, limit),
      this.getRiwayatPelanggaran(nis, limit),
      this.getSummary(nis),
    ]);
    return { success: true, data: { tumbler, belanja, pelanggaran, summary } };
  }
}

import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateTransaksiDto, CekVoucherDto } from './dto/transaksi.dto';

// ─── RESPONSE TYPES ───────────────────────────────────────────────────────────

export interface SiswaInfoResult {
  nis: string;
  nama: string;
  kelas: string;
  coins: number;
  streak: number;
  fotoUrl: string | null;
  voucherAktif: VoucherInfo[];
}

export interface VoucherInfo {
  id: number;
  kodeVoucher: string;
  namaVoucher: string;
  nominalVoucher: number;
  tipeVoucher: 'percentage' | 'fixed';
  tanggalBerakhir: string;
}

export interface ProdukKatalog {
  id: number;
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  jenisKemasan: 'plastik' | 'kertas' | 'tanpa_kemasan' | null;
  isActive: boolean;
  coinsPenaltyPerItem: number; // penalti koin per item sesuai kemasan (dari pengaturan)
}

// Detail penalti per item untuk struk transaksi
export interface KemasPenaltyDetail {
  namaProduk: string;
  jenisKemasan: string;
  qty: number;
  penaltyPerItem: number;
  totalPenalty: number;
}

export interface TransaksiResult {
  id: number;
  kodeTransaksi: string;
  totalHarga: number;
  totalDiskon: number;
  totalBayar: number;
  coinsUsed: number;
  // Penalti & Reward kemasan
  isByoc: boolean;
  coinsReward: number;
  coinsPenaltyTotal: number;
  coinsPenaltyDetail: KemasPenaltyDetail[];
  paymentMethod: string;
  createdAt: string;
}

export interface CekVoucherResult {
  valid: boolean;
  voucher?: VoucherInfo;
  message: string;
}

// Pengaturan penalti & reward kemasan dari tabel pengaturan
export interface PengaturanPenalty {
  plastik: number; // key: coins_penalty_plastik
  kertas: number;  // key: coins_penalty_kertas
  rewardWadah: number; // key: coins_reward_wadah
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────

@Injectable()
export class TransaksiService {
  constructor(private supabaseService: SupabaseService) {}

  private toRoman(value: number): string {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return String(value ?? '');
    const map: Array<[number, string]> = [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    let rem = Math.floor(n);
    let out = '';
    for (const [num, roman] of map) {
      while (rem >= num) {
        out += roman;
        rem -= num;
      }
    }
    return out || String(value ?? '');
  }

  // ── Helper: ambil nilai penalti & reward dari tabel pengaturan ────────────
  // Membaca key: coins_penalty_plastik, coins_penalty_kertas, coins_reward_wadah
  // Default fallback: plastik=5, kertas=2, reward=20 jika key belum ada di DB
  private async getPengaturanPenalty(): Promise<PengaturanPenalty> {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('pengaturan')
      .select('key, value')
      .in('key', ['coins_penalty_plastik', 'coins_penalty_kertas', 'coins_reward_wadah']);

    const map: Record<string, number> = {};
    (data ?? []).forEach((row) => {
      map[row.key] = parseInt(row.value, 10) || 0;
    });

    return {
      plastik: map['coins_penalty_plastik'] ?? 5,
      kertas:  map['coins_penalty_kertas']  ?? 2,
      rewardWadah: map['coins_reward_wadah'] ?? 20,
    };
  }

  // ── Helper: hitung penalti koin untuk 1 item berdasarkan kemasan ──────────
  private getPenaltyPerItem(
    jenisKemasan: string | null,
    penalty: PengaturanPenalty,
  ): number {
    switch (jenisKemasan) {
      case 'plastik':       return penalty.plastik;
      case 'kertas':        return penalty.kertas;
      case 'tanpa_kemasan': return 0;
      default:              return 0; // null → tidak ada info kemasan → tidak dikurangi
    }
  }

  // ── 1. Lookup Siswa ───────────────────────────────────────────────────────
  async lookupSiswa(rawNis: string): Promise<SiswaInfoResult> {
    const supabase = this.supabaseService.getClient();

    const nis = rawNis.includes(':')
      ? rawNis.split(':').pop()!.trim()
      : String(rawNis).trim();

    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('nis, nama, kelas_id, coins, streak, foto_url, is_active')
      .eq('nis', nis)
      .maybeSingle();

    if (error || !siswa) throw new NotFoundException('Siswa tidak ditemukan');
    if (!siswa.is_active) throw new BadRequestException('Akun siswa tidak aktif');

    let kelasLabel = '-';
    if (siswa.kelas_id) {
      const { data: kelas } = await supabase
        .from('kelas')
        .select('nama, tingkat')
        .eq('id', siswa.kelas_id)
        .maybeSingle();
      if (kelas) kelasLabel = `${this.toRoman(Number(kelas.tingkat))} ${kelas.nama}`;
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: vouchers } = await supabase
      .from('voucher')
      .select('id, kode_voucher, nama_voucher, nominal_voucher, tipe_voucher, tanggal_berakhir')
      .eq('nis', nis)
      .eq('status', 'available')
      .gte('tanggal_berakhir', today)
      .order('tanggal_berakhir', { ascending: true });

    return {
      nis:     siswa.nis,
      nama:    siswa.nama,
      kelas:   kelasLabel,
      coins:   siswa.coins   ?? 0,
      streak:  siswa.streak  ?? 0,
      fotoUrl: siswa.foto_url ?? null,
      voucherAktif: (vouchers ?? []).map((v) => ({
        id:              v.id,
        kodeVoucher:     v.kode_voucher,
        namaVoucher:     v.nama_voucher,
        nominalVoucher:  v.nominal_voucher,
        tipeVoucher:     v.tipe_voucher,
        tanggalBerakhir: v.tanggal_berakhir,
      })),
    };
  }

  // ── 2. Cek Voucher ────────────────────────────────────────────────────────
  async cekVoucher(dto: CekVoucherDto): Promise<CekVoucherResult> {
    const supabase = this.supabaseService.getClient();
    const today    = new Date().toISOString().split('T')[0];
    const nis      = String(dto.nis).trim();
    const kode     = dto.kodeVoucher.trim().toUpperCase();

    const { data: voucher } = await supabase
      .from('voucher')
      .select('id, kode_voucher, nama_voucher, nominal_voucher, tipe_voucher, tanggal_berlaku, tanggal_berakhir, nis, status')
      .eq('kode_voucher', kode)
      .maybeSingle();

    if (!voucher) return { valid: false, message: 'Kode voucher tidak ditemukan' };
    if (voucher.status !== 'available') return { valid: false, message: 'Voucher sudah digunakan atau tidak aktif' };
    if (voucher.tanggal_berakhir < today) return { valid: false, message: 'Voucher sudah kadaluarsa' };
    if (voucher.tanggal_berlaku > today) return { valid: false, message: 'Voucher belum berlaku' };
    if (voucher.nis && voucher.nis !== nis) return { valid: false, message: 'Voucher ini tidak berlaku untuk siswa ini' };

    return {
      valid: true,
      message: 'Voucher valid',
      voucher: {
        id:              voucher.id,
        kodeVoucher:     voucher.kode_voucher,
        namaVoucher:     voucher.nama_voucher,
        nominalVoucher:  voucher.nominal_voucher,
        tipeVoucher:     voucher.tipe_voucher,
        tanggalBerakhir: voucher.tanggal_berakhir,
      },
    };
  }

  // ── 3. Katalog Produk (disertai info penalti kemasan) ─────────────────────
  // Penalti dibaca dari pengaturan saat load katalog sehingga frontend
  // bisa tampilkan info penalti sebelum transaksi dibuat
  async getProdukKatalog(kantinId: number): Promise<ProdukKatalog[]> {
    const supabase = this.supabaseService.getClient();

    // Ambil produk & pengaturan secara paralel
    const [{ data: produkRows, error }, penalty] = await Promise.all([
      supabase
        .from('produk')
        .select('id, nama, harga, stok, kategori, jenis_kemasan, is_active')
        .eq('is_active', true)
        .eq('created_by', kantinId)
        .gt('stok', 0)
        .order('kategori')
        .order('nama'),
      this.getPengaturanPenalty(),
    ]);

    if (error) throw new BadRequestException(`Gagal ambil produk: ${error.message}`);

    return (produkRows ?? []).map((p) => ({
      id:           p.id,
      nama:         p.nama,
      harga:        p.harga,
      stok:         p.stok,
      kategori:     p.kategori,
      jenisKemasan: p.jenis_kemasan ?? null,
      isActive:     p.is_active,
      coinsPenaltyPerItem: this.getPenaltyPerItem(p.jenis_kemasan, penalty),
    }));
  }

  // ── 4. Buat Transaksi ─────────────────────────────────────────────────────
  async createTransaksi(dto: CreateTransaksiDto, kantinId: number): Promise<TransaksiResult> {
    const supabase = this.supabaseService.getClient();
    const nis      = String(dto.nis).trim();

    // Validasi siswa
    const { data: siswa } = await supabase
      .from('siswa')
      .select('nis, coins, is_active')
      .eq('nis', nis)
      .maybeSingle();

    if (!siswa || !siswa.is_active) throw new NotFoundException('Siswa tidak ditemukan atau tidak aktif');
    if (!dto.items || dto.items.length === 0) throw new BadRequestException('Keranjang kosong');

    const produkIds = dto.items.map((i) => i.produkId);

    // Ambil data produk + pengaturan penalti secara paralel
    const [{ data: produkRows }, penalty] = await Promise.all([
      supabase
        .from('produk')
        .select('id, nama, harga, stok, jenis_kemasan, is_active')
        .in('id', produkIds),
      this.getPengaturanPenalty(),
    ]);

    const produkMap: Record<number, {
      id: number; nama: string; harga: number;
      stok: number; jenisKemasan: string | null;
    }> = {};
    (produkRows ?? []).forEach((p) => {
      produkMap[p.id] = {
        id: p.id, nama: p.nama, harga: p.harga,
        stok: p.stok, jenisKemasan: p.jenis_kemasan ?? null,
      };
    });

    // Validasi stok & hitung total harga
    let totalHarga = 0;
    for (const item of dto.items) {
      const p = produkMap[item.produkId];
      if (!p) throw new BadRequestException(`Produk ID ${item.produkId} tidak ditemukan`);
      if (p.stok < item.quantity) throw new BadRequestException(`Stok ${p.nama} tidak cukup (sisa: ${p.stok})`);
      totalHarga += p.harga * item.quantity;
    }

    // ── Hitung penalti / reward kemasan (BYOC) ──────────────────────────────
    // Item-level BYOC:
    // Jika item.isByoc = true, maka:
    //   - TIDAK ada penalti koin (0)
    //   - Mendapatkan koin reward (hanya jika produk memang punya jenisKemasan plastik/kertas)
    // Jika item.isByoc = false, maka:
    //   - Dikenakan penalti sesuai kemasannya
    const coinsPenaltyDetail: KemasPenaltyDetail[] = [];
    let coinsPenaltyTotal = 0;
    let coinsRewardTotal  = 0;
    
    // Asumsikan semua transaksi dicatat sebagai isByoc=false di database globalnya,
    // karena reward dan penaltinya sudah terakumulasi benar di kolom
    // coins_reward dan coins_penalty. Kita hanya kirimkan totalnya.
    const isByocGlobal = false;

    for (const item of dto.items) {
      const p          = produkMap[item.produkId];
      const isPlastikAtauKertas = p.jenisKemasan === 'plastik' || p.jenisKemasan === 'kertas';

      if (item.isByoc && isPlastikAtauKertas) {
        // Jika BYOC untuk item berpotensi penalti, beri reward
        // Reward per item atau per transaksi? Saat ini dihitung per item wadah yang dibawa.
        // Jika itemnya 2 (Nasi x2) = bawa 2 wadah = reward x2.
        coinsRewardTotal += penalty.rewardWadah * item.quantity;
      } else if (!item.isByoc) {
        // Hitung penalti kemasan seperti biasa
        const perItem    = this.getPenaltyPerItem(p.jenisKemasan, penalty);
        const totalItem  = perItem * item.quantity;

        if (perItem > 0) {
          coinsPenaltyDetail.push({
            namaProduk:    p.nama,
            jenisKemasan:  p.jenisKemasan!,
            qty:           item.quantity,
            penaltyPerItem: perItem,
            totalPenalty:  totalItem,
          });
          coinsPenaltyTotal += totalItem;
        }
      }
    }

    // ── Diskon dari voucher ────────────────────────────────────────────────
    if (!['tunai', 'voucher'].includes(dto.paymentMethod)) {
      throw new BadRequestException('Metode pembayaran tidak valid');
    }

    let totalDiskon = 0;
    let voucherId: number | null = null;

    if (dto.paymentMethod === 'voucher') {
      if (!dto.voucherId) {
        throw new BadRequestException('voucherId wajib diisi saat paymentMethod = voucher');
      }

      const { data: voucher } = await supabase
        .from('voucher')
        .select('id, nominal_voucher, tipe_voucher, status, nis, tanggal_berakhir, tanggal_berlaku')
        .eq('id', dto.voucherId)
        .maybeSingle();

      const today = new Date().toISOString().split('T')[0];
      if (!voucher || voucher.status !== 'available') throw new BadRequestException('Voucher tidak valid');
      if (voucher.tanggal_berakhir < today || voucher.tanggal_berlaku > today) throw new BadRequestException('Voucher tidak dalam periode berlaku');
      if (voucher.nis && voucher.nis !== nis) throw new BadRequestException('Voucher ini tidak berlaku untuk siswa ini');

      totalDiskon = voucher.tipe_voucher === 'percentage'
        ? Math.round((voucher.nominal_voucher / 100) * totalHarga)
        : voucher.nominal_voucher;
      totalDiskon = Math.min(totalDiskon, totalHarga);
      voucherId   = voucher.id;
    }

    // ── Bayar pakai koin ───────────────────────────────────────────────────
    const coinsUsed = 0;

    const totalBayar    = Math.max(0, totalHarga - totalDiskon);
    const kodeTransaksi = `TRX-${kantinId}-${Date.now()}`;

    // ── INSERT transaksi ───────────────────────────────────────────────────
    const { data: txRow, error: errTx } = await supabase
      .from('transaksi')
      .insert({
        kode_transaksi: kodeTransaksi,
        nis,
        kantin_id:      kantinId,
        total_harga:    totalHarga,
        total_diskon:   totalDiskon,
        total_bayar:    totalBayar,
        coins_used:     coinsUsed,
        payment_method: dto.paymentMethod,
        voucher_id:     voucherId,
        is_byoc:        isByocGlobal,
        coins_reward:   coinsRewardTotal,
        coins_penalty:  coinsPenaltyTotal,
      })
      .select('id, kode_transaksi, created_at')
      .single();

    if (errTx || !txRow) throw new BadRequestException(`Gagal menyimpan transaksi: ${errTx?.message}`);

    // ── INSERT detail transaksi ────────────────────────────────────────────
    const { error: errDetail } = await supabase
      .from('detail_transaksi')
      .insert(dto.items.map((item) => ({
        transaksi_id: txRow.id,
        produk_id:    item.produkId,
        nama_produk:  produkMap[item.produkId].nama,
        quantity:     item.quantity,
        harga_satuan: produkMap[item.produkId].harga,
        subtotal:     produkMap[item.produkId].harga * item.quantity,
      })));

    if (errDetail) throw new BadRequestException(`Gagal menyimpan detail: ${errDetail.message}`);

    // ── Update stok produk ─────────────────────────────────────────────────
    for (const item of dto.items) {
      const p = produkMap[item.produkId];
      await supabase
        .from('produk')
        .update({ stok: p.stok - item.quantity, updated_at: new Date().toISOString() })
        .eq('id', item.produkId);
    }

    // ── Update coins siswa ─────────────────────────────────────────────────
    // Penalti kemasan mengurangi koin, Reward kemasan menambah koin.
    const coinsAwal     = siswa.coins ?? 0;
    let coinsFinal      = coinsAwal;
    
    // Kurangi penalti dulu
    if (coinsPenaltyTotal > 0) {
      coinsFinal = Math.max(0, coinsFinal - coinsPenaltyTotal);
    }
    
    // Tambah reward
    if (coinsRewardTotal > 0) {
      coinsFinal = coinsFinal + coinsRewardTotal;
    }

    if (coinsPenaltyTotal > 0 || coinsRewardTotal > 0) {
      await supabase
        .from('siswa')
        .update({ coins: coinsFinal, updated_at: new Date().toISOString() })
        .eq('nis', nis);
    }

    // ── Tandai voucher terpakai ────────────────────────────────────────────
    if (voucherId) {
      await supabase
        .from('voucher')
        .update({ status: 'used', used_at: new Date().toISOString(), transaction_id: txRow.id })
        .eq('id', voucherId);
    }
 
    return {
      id:                 txRow.id,
      kodeTransaksi:      txRow.kode_transaksi,
      totalHarga,
      totalDiskon,
      totalBayar,
      coinsUsed,
      isByoc:             isByocGlobal,
      coinsReward:        coinsRewardTotal,
      coinsPenaltyTotal,
      coinsPenaltyDetail,
      paymentMethod:      dto.paymentMethod,
      createdAt:          txRow.created_at,
    };
  }
}

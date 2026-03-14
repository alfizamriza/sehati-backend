import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min, Max, IsDateString } from 'class-validator';

export interface RiwayatItemDetail {
  nama: string; qty: number; harga: number; subtotal: number;
}
export interface RiwayatItem {
  id: number; kodeTransaksi: string; nis: string; namaSiswa: string; kelas: string;
  produkLabel: string; items: RiwayatItemDetail[];
  totalHarga: number; totalDiskon: number; totalBayar: number; coinsUsed: number;
  paymentMethod: 'tunai' | 'voucher' | 'coins'; createdAt: string;
}
export interface RiwayatStats {
  totalTransaksi: number; totalPendapatan: number;
  countTunai: number; countVoucher: number; countCoins: number;
  pctTunai: number; pctVoucher: number; pctCoins: number;
}
export interface InfoSekolah {
  namaSekolah: string; npsn: string; alamat: string; emailSekolah: string; nomorHp: string;
}
export interface InfoKantin {
  id: number;
  namaKantin: string;
  username: string;
  nomorHp: string;
}
export class QueryRiwayatDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'all', 'custom'])
  period?: 'today' | 'week' | 'month' | 'all' | 'custom';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['tunai', 'voucher', 'coins'])
  paymentMethod?: 'tunai' | 'voucher' | 'coins';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@Injectable()
export class RiwayatKantinService {
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

  private getDateRange(period: string) {
    const now = new Date(), today = now.toISOString().split('T')[0];
    switch (period) {
      case 'today': return { start: today, end: today };
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 6); return { start: d.toISOString().split('T')[0], end: today }; }
      case 'month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { start: d.toISOString().split('T')[0], end: today }; }
      case 'all': return { start: '2000-01-01', end: today };
      default: { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { start: d.toISOString().split('T')[0], end: today }; }
    }
  }

  private buildProdukLabel(items: RiwayatItemDetail[]) {
    if (!items.length) return '-';
    const f = `${items[0].nama} x${items[0].qty}`;
    return items.length > 1 ? `${f} (+${items.length - 1} lainnya)` : f;
  }

  async getRiwayat(kantinId: number, query: QueryRiwayatDto) {
    const supabase = this.supabaseService.getClient();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Number(query.limit) || 15);
    const offset = (page - 1) * limit;
    let startDate: string, endDate: string;
    if (query.period === 'custom' && query.startDate && query.endDate) {
      startDate = query.startDate; endDate = query.endDate;
    } else {
      const r = this.getDateRange(query.period ?? 'today');
      startDate = r.start; endDate = r.end;
    }

    let q = supabase.from('transaksi')
      .select(`id,kode_transaksi,nis,total_harga,total_diskon,total_bayar,coins_used,payment_method,created_at,detail_transaksi(nama_produk,quantity,harga_satuan,subtotal)`, { count: 'exact' })
      .eq('kantin_id', kantinId)
      .gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (query.paymentMethod) q = q.eq('payment_method', query.paymentMethod);

    const { data: txRows, error, count } = await q;
    if (error) throw new BadRequestException(`Gagal: ${error.message}`);

    const nisList = [...new Set((txRows ?? []).map((t: any) => t.nis as string))];
    const siswaMap: Record<string, { nama: string; kelas: string }> = {};
    if (nisList.length > 0) {
      const { data: sr } = await supabase.from('siswa').select('nis,nama,kelas_id').in('nis', nisList);
      const kelasIds = [...new Set((sr ?? []).map((s: any) => s.kelas_id).filter(Boolean))];
      const km: Record<number, string> = {};
      if (kelasIds.length > 0) {
        const { data: kr } = await supabase.from('kelas').select('id,nama,tingkat').in('id', kelasIds);
        (kr ?? []).forEach((k: any) => {
          const romanTingkat = this.toRoman(Number(k.tingkat));
          km[k.id] = `${romanTingkat} ${k.nama}`;
        });
      }
      (sr ?? []).forEach((s: any) => { siswaMap[s.nis] = { nama: s.nama ?? s.nis, kelas: km[s.kelas_id] ?? '-' }; });
    }

    let rows = txRows ?? [];
    if (query.search) {
      const sq = query.search.toLowerCase();
      rows = rows.filter((t: any) => {
        const s = siswaMap[t.nis];
        return s?.nama?.toLowerCase().includes(sq) || String(t.nis).includes(sq) || t.kode_transaksi?.toLowerCase().includes(sq);
      });
    }

    const data: RiwayatItem[] = rows.map((t: any) => {
      const items = (t.detail_transaksi ?? []).map((d: any) => ({ nama: d.nama_produk, qty: d.quantity, harga: d.harga_satuan, subtotal: d.subtotal }));
      return { id: t.id, kodeTransaksi: t.kode_transaksi, nis: t.nis,
        namaSiswa: siswaMap[t.nis]?.nama ?? t.nis, kelas: siswaMap[t.nis]?.kelas ?? '-',
        produkLabel: this.buildProdukLabel(items), items,
        totalHarga: t.total_harga ?? 0, totalDiskon: t.total_diskon ?? 0,
        totalBayar: t.total_bayar ?? 0, coinsUsed: t.coins_used ?? 0,
        paymentMethod: t.payment_method, createdAt: t.created_at };
    });

    const { data: sRows } = await supabase.from('transaksi').select('total_bayar,payment_method')
      .eq('kantin_id', kantinId).gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    const all = sRows ?? [], safe = all.length || 1;
    const cT = all.filter((r: any) => r.payment_method === 'tunai').length;
    const cV = all.filter((r: any) => r.payment_method === 'voucher').length;
    const cC = all.filter((r: any) => r.payment_method === 'coins').length;

    return {
      data, stats: {
        totalTransaksi: all.length,
        totalPendapatan: all.reduce((s: number, r: any) => s + (r.total_bayar ?? 0), 0),
        countTunai: cT, countVoucher: cV, countCoins: cC,
        pctTunai: Math.round(cT/safe*100), pctVoucher: Math.round(cV/safe*100), pctCoins: Math.round(cC/safe*100),
      },
      meta: { page, limit, total: count ?? rows.length, totalPages: Math.ceil((count ?? rows.length) / limit), startDate, endDate },
    };
  }

  async getForExport(kantinId: number, query: QueryRiwayatDto) {
    const full = await this.getRiwayat(kantinId, { ...query, page: 1, limit: 500 });
    const [infoSekolah, infoKantin] = await Promise.all([
      this.getInfoSekolah(),
      this.getInfoKantin(kantinId),
    ]);
    return {
      data: full.data,
      stats: full.stats,
      infoSekolah,
      infoKantin,
      startDate: full.meta.startDate,
      endDate: full.meta.endDate,
    };
  }

  async getInfoSekolah(): Promise<InfoSekolah> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase.from('pengaturan').select('key,value')
      .in('key', ['nama_sekolah', 'npsn', 'alamat', 'email_sekolah', 'nomor_hp']);
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { m[r.key] = r.value ?? ''; });
    return { namaSekolah: m['nama_sekolah'] ?? 'Nama Sekolah', npsn: m['npsn'] ?? '-', alamat: m['alamat'] ?? '-', emailSekolah: m['email_sekolah'] ?? '-', nomorHp: m['nomor_hp'] ?? '-' };
  }

  async getInfoKantin(kantinId: number): Promise<InfoKantin> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('users')
      .select('id,nama,username,no_hp')
      .eq('id', kantinId)
      .single();
    return {
      id: Number(data?.id ?? kantinId ?? 0),
      namaKantin: data?.nama ?? `Kantin #${kantinId}`,
      username: data?.username ?? '-',
      nomorHp: data?.no_hp ?? '-',
    };
  }
}

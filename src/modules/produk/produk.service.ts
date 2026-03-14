import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import {
  CreateProdukDto, UpdateProdukDto, QueryProdukDto, ResetStokHarianDto,
} from './dto/produk.dto';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ProdukResponse {
  id: number;
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  jenisKemasan: 'plastik' | 'kertas' | 'tanpa_kemasan' | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Titipan harian
  isTitipan: boolean;
  stokHarian: number | null;
  stokSisa: number | null;
  terjualHarian: number | null;
}

export interface StatsProduk {
  totalProduk: number;
  totalAktif: number;
  stokRendah: number;
  stokHabis: number;
  totalTitipan: number;
  titipanTerjual: number;
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProdukService {
  constructor(private supabaseService: SupabaseService) { }

  private mapRow(p: any): ProdukResponse {
    const stokHarian = p.stok_harian ?? null;
    const stokSisa = p.is_titipan ? (p.stok ?? 0) : null;
    const terjual = (p.is_titipan && stokHarian !== null && stokSisa !== null)
      ? Math.max(0, stokHarian - stokSisa)
      : null;

    return {
      id: p.id,
      nama: p.nama ?? '',
      harga: p.harga ?? 0,
      stok: p.stok ?? 0,
      kategori: p.kategori ?? '-',
      jenisKemasan: p.jenis_kemasan ?? null,
      isActive: p.is_active ?? true,
      createdAt: p.created_at ?? '',
      updatedAt: p.updated_at ?? '',
      isTitipan: p.is_titipan ?? false,
      stokHarian,
      stokSisa,
      terjualHarian: terjual,
    };
  }

  // ── SELECT helper ─────────────────────────────────────────────────────────
  private get SELECT() {
    return 'id, nama, harga, stok, kategori, jenis_kemasan, is_active, is_titipan, stok_harian, created_at, updated_at';
  }

  // ── 1. GET semua produk milik kantin ─────────────────────────────────────
  async getAllProduk(kantinId: number, query: QueryProdukDto = {}): Promise<ProdukResponse[]> {
    const supabase = this.supabaseService.getClient();

    let q = supabase
      .from('produk')
      .select(this.SELECT)
      .eq('created_by', kantinId)
      .order('kategori')
      .order('nama');

    if (query.kategori) q = q.eq('kategori', query.kategori);
    if (query.search) q = q.ilike('nama', `%${query.search}%`);
    if (query.isActive !== undefined) q = q.eq('is_active', query.isActive === 'true');
    if (query.isTitipan !== undefined) q = q.eq('is_titipan', query.isTitipan === 'true');

    const { data, error } = await q;
    if (error) throw new BadRequestException(`Gagal mengambil produk: ${error.message}`);
    return (data ?? []).map((r) => this.mapRow(r));
  }

  // ── 2. GET satu produk ────────────────────────────────────────────────────
  async getOneProduk(kantinId: number, produkId: number): Promise<ProdukResponse> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('produk')
      .select(this.SELECT)
      .eq('id', produkId)
      .eq('created_by', kantinId)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Produk tidak ditemukan');
    return this.mapRow(data);
  }

  // ── 3. Statistik produk ───────────────────────────────────────────────────
  async getStats(kantinId: number): Promise<StatsProduk> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('produk')
      .select('stok, is_active, is_titipan, stok_harian')
      .eq('created_by', kantinId);

    const rows = data ?? [];
    let titipanTerjual = 0;
    rows.forEach((r) => {
      if (r.is_titipan && r.stok_harian !== null) {
        titipanTerjual += Math.max(0, (r.stok_harian ?? 0) - (r.stok ?? 0));
      }
    });

    return {
      totalProduk: rows.length,
      totalAktif: rows.filter((r) => r.is_active).length,
      stokRendah: rows.filter((r) => r.is_active && r.stok > 0 && r.stok <= 10).length,
      stokHabis: rows.filter((r) => r.is_active && r.stok === 0).length,
      totalTitipan: rows.filter((r) => r.is_titipan).length,
      titipanTerjual,
    };
  }

  // ── 4. GET kategori unik ──────────────────────────────────────────────────
  async getKategori(kantinId: number): Promise<string[]> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('produk')
      .select('kategori')
      .eq('created_by', kantinId)
      .eq('is_active', true);

    return [...new Set((data ?? []).map((r) => r.kategori as string))].sort();
  }

  // ── 5. CREATE produk ──────────────────────────────────────────────────────
  async createProduk(kantinId: number, dto: CreateProdukDto): Promise<ProdukResponse> {
    const supabase = this.supabaseService.getClient();

    if (!dto.nama?.trim()) throw new BadRequestException('Nama produk wajib diisi');
    if (!dto.harga || dto.harga <= 0) throw new BadRequestException('Harga harus lebih dari 0');
    if ((dto.stok ?? 0) < 0) throw new BadRequestException('Stok tidak boleh negatif');
    if (!dto.kategori?.trim()) throw new BadRequestException('Kategori wajib diisi');

    const isTitipan = dto.isTitipan ?? false;
    const stokHarian = isTitipan ? (dto.stokHarian ?? dto.stok ?? 0) : null;

    const { data, error } = await supabase
      .from('produk')
      .insert({
        nama: dto.nama.trim(),
        harga: dto.harga,
        stok: isTitipan ? (dto.stokHarian ?? dto.stok ?? 0) : (dto.stok ?? 0),
        kategori: dto.kategori.trim(),
        jenis_kemasan: dto.jenisKemasan ?? null,
        is_active: true,
        created_by: kantinId,
        is_titipan: isTitipan,
        stok_harian: stokHarian,
      })
      .select(this.SELECT)
      .single();

    if (error) throw new BadRequestException(`Gagal menambah produk: ${error.message}`);
    return this.mapRow(data);
  }

  // ── 6. UPDATE produk ──────────────────────────────────────────────────────
  async updateProduk(kantinId: number, produkId: number, dto: UpdateProdukDto): Promise<ProdukResponse> {
    const supabase = this.supabaseService.getClient();
    await this.verifyOwner(kantinId, produkId);

    const upd: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.nama !== undefined) upd.nama = dto.nama.trim();
    if (dto.harga !== undefined) upd.harga = dto.harga;
    if (dto.stok !== undefined) upd.stok = dto.stok;
    if (dto.kategori !== undefined) upd.kategori = dto.kategori.trim();
    if (dto.jenisKemasan !== undefined) upd.jenis_kemasan = dto.jenisKemasan ?? null;
    if (dto.isActive !== undefined) upd.is_active = dto.isActive;
    if (dto.isTitipan !== undefined) upd.is_titipan = dto.isTitipan;
    if (dto.stokHarian !== undefined) upd.stok_harian = dto.stokHarian;

    const { data, error } = await supabase
      .from('produk')
      .update(upd)
      .eq('id', produkId)
      .select(this.SELECT)
      .single();

    if (error) throw new BadRequestException(`Gagal update produk: ${error.message}`);
    return this.mapRow(data);
  }

  // ── 7. RESET stok harian titipan (dipanggil setiap pagi) ─────────────────
  // Kantin set stok titipan hari ini → stok direset ke nilai baru
  async resetStokHarian(kantinId: number, produkId: number, dto: ResetStokHarianDto): Promise<ProdukResponse> {
    const supabase = this.supabaseService.getClient();
    const existing = await this.verifyOwner(kantinId, produkId);

    if (!existing.is_titipan) {
      throw new BadRequestException('Produk ini bukan titipan harian. Aktifkan is_titipan terlebih dahulu.');
    }
    if (dto.stokHarian < 0) throw new BadRequestException('Stok harian tidak boleh negatif');

    const { data, error } = await supabase
      .from('produk')
      .update({
        stok: dto.stokHarian,
        stok_harian: dto.stokHarian,
        updated_at: new Date().toISOString(),
      })
      .eq('id', produkId)
      .select(this.SELECT)
      .single();

    if (error) throw new BadRequestException(`Gagal reset stok harian: ${error.message}`);
    return this.mapRow(data);
  }

  // ── 8. UPDATE stok saja (tambah/kurang manual) ───────────────────────────
  async patchStok(kantinId: number, produkId: number, stokBaru: number): Promise<{ stok: number }> {
    const supabase = this.supabaseService.getClient();
    if (stokBaru < 0) throw new BadRequestException('Stok tidak boleh negatif');
    await this.verifyOwner(kantinId, produkId);

    const { error } = await supabase
      .from('produk')
      .update({ stok: stokBaru, updated_at: new Date().toISOString() })
      .eq('id', produkId);

    if (error) throw new BadRequestException(`Gagal update stok: ${error.message}`);
    return { stok: stokBaru };
  }

  // ── 9. Soft delete (is_active = false) ───────────────────────────────────
  async deleteProduk(kantinId: number, produkId: number): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await this.verifyOwner(kantinId, produkId);

    const { error } = await supabase
      .from('produk')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', produkId);

    if (error) throw new BadRequestException(`Gagal hapus produk: ${error.message}`);
  }

  // ── Private: verifikasi kepemilikan ──────────────────────────────────────
  private async verifyOwner(kantinId: number, produkId: number): Promise<any> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('produk')
      .select('id, created_by, is_titipan')
      .eq('id', produkId)
      .maybeSingle();

    if (!data) throw new NotFoundException('Produk tidak ditemukan');
    if (Number(data.created_by) !== Number(kantinId)) {
      throw new BadRequestException('Produk bukan milik kantin ini');
    }
    return data;
  }
}
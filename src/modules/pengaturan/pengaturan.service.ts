// pengaturan/pengaturan.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Pengaturan {
  key: string;
  value: string;
  label?: string;
  tipe?: 'text' | 'number' | 'boolean' | 'date';
  deskripsi?: string;
  updated_at?: string;
}

export interface TanggalLibur {
  id?: number;
  tanggal: string;
  keterangan: string;
  is_active?: boolean;
  created_at?: string;
}

export interface JenisPelanggaran {
  id?: number;
  nama: string;
  kategori: 'ringan' | 'sedang' | 'berat';
  bobot_coins: number;
  deskripsi?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Achievement {
  id?: number;
  nama: string;
  deskripsi?: string;
  tipe: 'streak' | 'coins' | 'tumbler' | 'pelanggaran' | 'transaksi';
  target_value: number;
  icon?: string;
  badge_color?: string;
  coins_reward?: number;
  is_active?: boolean;
  voucher_reward?: boolean;
  voucher_nominal?: number | null;
  voucher_tipe_voucher?: 'percentage' | 'fixed' | null;
  created_at?: string;
}

@Injectable()
export class PengaturanService {
  private readonly db: SupabaseClient;

  constructor(private readonly supabase: SupabaseService) {
    // Cache client sekali di constructor agar tidak error di seluruh method
    this.db = this.supabase.getClient();
  }

  // ==============================
  //   PENGATURAN (key-value store)
  // ==============================

  async findAll(): Promise<Pengaturan[]> {
    const { data, error } = await this.db
      .from('pengaturan')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findByKey(key: string): Promise<Pengaturan> {
    const { data, error } = await this.db
      .from('pengaturan')
      .select('*')
      .eq('key', key)
      .single();

    if (error || !data) throw new NotFoundException(`Setting dengan key "${key}" tidak ditemukan.`);
    return data;
  }

  async updateByKey(key: string, value: string): Promise<Pengaturan> {
    const { data, error } = await this.db
      .from('pengaturan')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Setting "${key}" tidak ditemukan atau gagal diupdate.`);
    return data;
  }

  async bulkUpdate(items: { key: string; value: string }[]): Promise<{ updated: number }> {
    const updates = items.map((item) =>
      this.db
        .from('pengaturan')
        .update({ value: item.value, updated_at: new Date().toISOString() })
        .eq('key', item.key),
    );

    await Promise.all(updates);
    return { updated: items.length };
  }

  // ==============================
  //   TANGGAL LIBUR
  // ==============================

  async findAllLibur(): Promise<TanggalLibur[]> {
    const { data, error } = await this.db
      .from('tanggal_libur')
      .select('*')
      .order('tanggal', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createLibur(dto: Omit<TanggalLibur, 'id' | 'created_at'>): Promise<TanggalLibur> {
    const { data, error } = await this.db
      .from('tanggal_libur')
      .insert(dto)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new BadRequestException('Tanggal tersebut sudah terdaftar sebagai hari libur.');
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async updateLibur(id: number, dto: Partial<Omit<TanggalLibur, 'id' | 'created_at'>>): Promise<TanggalLibur> {
    const { data, error } = await this.db
      .from('tanggal_libur')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Hari libur dengan id ${id} tidak ditemukan.`);
    return data;
  }

  async deleteLibur(id: number): Promise<{ message: string }> {
    const { error } = await this.db
      .from('tanggal_libur')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Hari libur berhasil dihapus.' };
  }

  async toggleLiburActive(id: number): Promise<TanggalLibur> {
    const { data: existingData, error: existingError } = await this.db
      .from('tanggal_libur')
      .select('is_active')
      .eq('id', id)
      .single();

    if (existingError || !existingData) throw new NotFoundException(`Hari libur id ${id} tidak ditemukan.`);

    const { data, error } = await this.db
      .from('tanggal_libur')
      .update({ is_active: !existingData.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ==============================
  //   JENIS PELANGGARAN
  // ==============================

  async findAllPelanggaran(kategori?: string): Promise<JenisPelanggaran[]> {
    let query = this.db
      .from('jenis_pelanggaran')
      .select('*')
      .order('kategori', { ascending: true })
      .order('nama', { ascending: true });

    if (kategori) query = query.eq('kategori', kategori);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createPelanggaran(dto: Omit<JenisPelanggaran, 'id' | 'created_at'>): Promise<JenisPelanggaran> {
    if (dto.bobot_coins <= 0) throw new BadRequestException('Bobot coins harus lebih dari 0.');

    const { data, error } = await this.db
      .from('jenis_pelanggaran')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updatePelanggaran(id: number, dto: Partial<Omit<JenisPelanggaran, 'id' | 'created_at'>>): Promise<JenisPelanggaran> {
    if (dto.bobot_coins !== undefined && dto.bobot_coins <= 0) {
      throw new BadRequestException('Bobot coins harus lebih dari 0.');
    }

    const { data, error } = await this.db
      .from('jenis_pelanggaran')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Pelanggaran dengan id ${id} tidak ditemukan.`);
    return data;
  }

  async deletePelanggaran(id: number): Promise<{ message: string }> {
    const { error } = await this.db
      .from('jenis_pelanggaran')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Jenis pelanggaran berhasil dihapus.' };
  }

  async togglePelanggaranActive(id: number): Promise<JenisPelanggaran> {
    const { data: existingData, error: existingError } = await this.db
      .from('jenis_pelanggaran')
      .select('is_active')
      .eq('id', id)
      .single();

    if (existingError || !existingData) throw new NotFoundException(`Pelanggaran id ${id} tidak ditemukan.`);

    const { data, error } = await this.db
      .from('jenis_pelanggaran')
      .update({ is_active: !existingData.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findAllAchievement(tipe?: string): Promise<Achievement[]> {
    let query = this.db
      .from('achievement')
      .select('*')
      .order('tipe', { ascending: true })
      .order('target_value', { ascending: true });

    if (tipe) query = query.eq('tipe', tipe);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createAchievement(dto: Omit<Achievement, 'id' | 'created_at'>): Promise<Achievement> {
    if (dto.target_value < 0) throw new BadRequestException('Target value tidak boleh negatif.');
    if ((dto.coins_reward ?? 0) < 0) throw new BadRequestException('Coins reward tidak boleh negatif.');
    if (dto.voucher_reward) {
      if (!dto.voucher_nominal || dto.voucher_nominal <= 0 || !dto.voucher_tipe_voucher) {
        throw new BadRequestException('Jika voucher aktif, nominal dan tipe voucher wajib diisi.');
      }
    } else {
      dto.voucher_nominal = null;
      dto.voucher_tipe_voucher = null;
    }

    const { data, error } = await this.db
      .from('achievement')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateAchievement(
    id: number,
    dto: Partial<Omit<Achievement, 'id' | 'created_at'>>,
  ): Promise<Achievement> {
    if (dto.target_value !== undefined && dto.target_value < 0)
      throw new BadRequestException('Target value tidak boleh negatif.');
    if (dto.coins_reward !== undefined && dto.coins_reward < 0)
      throw new BadRequestException('Coins reward tidak boleh negatif.');

    const { data: existing, error: existingError } = await this.db
      .from('achievement')
      .select('voucher_reward,voucher_nominal,voucher_tipe_voucher')
      .eq('id', id)
      .single();

    if (existingError || !existing) throw new NotFoundException(`Achievement id ${id} tidak ditemukan.`);

    const effectiveVoucherReward = dto.voucher_reward ?? existing.voucher_reward ?? false;
    const effectiveVoucherNominal = dto.voucher_nominal ?? existing.voucher_nominal ?? null;
    const effectiveVoucherType = dto.voucher_tipe_voucher ?? existing.voucher_tipe_voucher ?? null;

    if (effectiveVoucherReward && (!effectiveVoucherNominal || !effectiveVoucherType)) {
      throw new BadRequestException('Jika voucher aktif, nominal dan tipe voucher wajib diisi.');
    }

    if (dto.voucher_reward === false) {
      dto.voucher_nominal = null;
      dto.voucher_tipe_voucher = null;
    }

    const { data, error } = await this.db
      .from('achievement')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Achievement id ${id} tidak ditemukan.`);
    return data;
  }

  async deleteAchievement(id: number): Promise<{ message: string }> {
    const { error } = await this.db
      .from('achievement')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Achievement berhasil dihapus.' };
  }

  async toggleAchievementActive(id: number): Promise<Achievement> {
    const { data: existing, error: existingError } = await this.db
      .from('achievement')
      .select('is_active')
      .eq('id', id)
      .single();

    if (existingError || !existing) throw new NotFoundException(`Achievement id ${id} tidak ditemukan.`);

    const { data, error } = await this.db
      .from('achievement')
      .update({ is_active: !existing.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}

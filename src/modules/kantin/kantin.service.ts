import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateKantinDto } from './dto/create-kantin.dto';
import { UpdateKantinDto } from './dto/update-kantin.dto';
import type { UpdateKantinPasswordDto } from './dto/update-kantin-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class KantinService {
  constructor(private supabaseService: SupabaseService) {}

  // ==========================================
  // GET ALL KANTIN
  // ==========================================
  async findAll() {
    const supabase = this.supabaseService.getClient();

    const { data: kantinList, error } = await supabase
      .from('users')
      .select('id, username, nama, no_hp, is_active, created_at')
      .eq('role', 'kantin')
      .order('nama', { ascending: true });

    if (error) {
      throw new BadRequestException('Gagal mengambil data kantin');
    }

    // Hitung jumlah produk per kantin secara paralel
    const enriched = await Promise.all(
      kantinList.map(async (kantin) => {
        const { count: jumlahProduk } = await supabase
          .from('produk')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', kantin.id);

        return {
          id: kantin.id,
          nama: kantin.nama,
          username: kantin.username,
          noHp: kantin.no_hp ?? null,
          statusAktif: kantin.is_active,
          jumlahProduk: jumlahProduk ?? 0,
          createdAt: kantin.created_at,
        };
      }),
    );

    return { success: true, data: enriched };
  }

  // ==========================================
  // GET KANTIN BY ID + PRODUKNYA
  // ==========================================
  async findOne(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: kantin, error } = await supabase
      .from('users')
      .select('id, username, nama, no_hp, is_active, created_at')
      .eq('id', id)
      .eq('role', 'kantin')
      .single();

    if (error || !kantin) {
      throw new NotFoundException('Kantin tidak ditemukan');
    }

    // Get semua produk milik kantin ini
    const { data: produkList } = await supabase
      .from('produk')
      .select('id, nama, harga, stok, kategori, jenis_kemasan, is_active, created_at')
      .eq('created_by', id)
      .order('nama', { ascending: true });

    return {
      success: true,
      data: {
        id: kantin.id,
        nama: kantin.nama,
        username: kantin.username,
        noHp: kantin.no_hp ?? null,
        statusAktif: kantin.is_active,
        createdAt: kantin.created_at,
        produk: (produkList ?? []).map((p) => ({
          id: p.id,
          nama: p.nama,
          harga: p.harga,
          stok: p.stok,
          kategori: p.kategori,
          jenisKemasan: p.jenis_kemasan ?? null,
          statusAktif: p.is_active,
          createdAt: p.created_at,
        })),
      },
    };
  }

  // ==========================================
  // CREATE KANTIN
  // ==========================================
  async create(dto: CreateKantinDto) {
    const supabase = this.supabaseService.getClient();

    // Cek duplikat username
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', dto.username)
      .single();

    if (existing) {
      throw new ConflictException(`Username "${dto.username}" sudah digunakan`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { data: newKantin, error } = await supabase
      .from('users')
      .insert([{
        username: dto.username,
        password: hashedPassword,
        nama: dto.nama,
        no_hp: dto.noHp ?? null,
        role: 'kantin',
        is_active: dto.statusAktif ?? true,
      }])
      .select('id, username, nama, no_hp, is_active')
      .single();

    if (error) {
      throw new BadRequestException('Gagal menambahkan akun kantin');
    }

    return {
      success: true,
      message: `Akun kantin ${newKantin.nama} berhasil dibuat`,
      data: {
        id: newKantin.id,
        nama: newKantin.nama,
        username: newKantin.username,
        noHp: newKantin.no_hp ?? null,
        statusAktif: newKantin.is_active,
      },
    };
  }

  // ==========================================
  // UPDATE KANTIN
  // ==========================================
  async update(id: number, dto: UpdateKantinDto) {
    const supabase = this.supabaseService.getClient();

    // Cek kantin exist
    const { data: existing } = await supabase
      .from('users')
      .select('id, nama, username')
      .eq('id', id)
      .eq('role', 'kantin')
      .single();

    if (!existing) {
      throw new NotFoundException('Kantin tidak ditemukan');
    }

    // Cek konflik username (jika diubah)
    if (dto.username && dto.username !== existing.username) {
      const { data: conflict } = await supabase
        .from('users')
        .select('id')
        .eq('username', dto.username)
        .neq('id', id)
        .single();

      if (conflict) {
        throw new ConflictException(`Username "${dto.username}" sudah digunakan`);
      }
    }

    // Siapkan update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.nama) updateData.nama = dto.nama;
    if (dto.username) updateData.username = dto.username;
    if (dto.noHp !== undefined) updateData.no_hp = dto.noHp || null;
    if (dto.statusAktif !== undefined) updateData.is_active = dto.statusAktif;
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new BadRequestException('Gagal mengupdate akun kantin');
    }

    return {
      success: true,
      message: `Akun kantin ${existing.nama} berhasil diupdate`,
    };
  }

  // ==========================================
  // DELETE KANTIN
  // ==========================================
  async remove(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('users')
      .select('id, nama')
      .eq('id', id)
      .eq('role', 'kantin')
      .single();

    if (!existing) {
      throw new NotFoundException('Kantin tidak ditemukan');
    }

    // Validasi: cek produk aktif
    const { count: jumlahProdukAktif } = await supabase
      .from('produk')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', id)
      .eq('is_active', true);

    if (jumlahProdukAktif && jumlahProdukAktif > 0) {
      throw new BadRequestException(
        `Tidak dapat menghapus kantin "${existing.nama}" yang masih memiliki ${jumlahProdukAktif} produk aktif. Nonaktifkan produk terlebih dahulu.`,
      );
    }

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Gagal menghapus akun kantin');
    }

    return {
      success: true,
      message: `Akun kantin ${existing.nama} berhasil dihapus`,
    };
  }

  async updatePassword(userId: number, dto: UpdateKantinPasswordDto) {
    const supabase = this.supabaseService.getClient();

    if (!dto.passwordBaru || dto.passwordBaru.length < 6) {
      throw new BadRequestException('Password baru minimal 6 karakter');
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, password')
      .eq('id', userId)
      .eq('role', 'kantin')
      .single();

    if (error || !user) {
      throw new NotFoundException('Akun kantin tidak ditemukan');
    }

    const valid = await bcrypt.compare(dto.passwordLama, user.password);
    if (!valid) {
      throw new BadRequestException('Password lama tidak sesuai');
    }

    const passwordHash = await bcrypt.hash(dto.passwordBaru, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('role', 'kantin');

    if (updateError) {
      throw new BadRequestException('Gagal mengubah password kantin');
    }

    return {
      success: true,
      message: 'Password kantin berhasil diubah',
    };
  }
}

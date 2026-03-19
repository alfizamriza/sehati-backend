import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateGuruDto } from './dto/create-guru.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';
import { UpdateGuruPasswordDto } from './dto/update-guru-password.dto';
import * as bcrypt from 'bcrypt';

function formatKelasLabel(tingkat: number, nama: string): string {
  const romanMap: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII',
  };
  return `${romanMap[tingkat] ?? tingkat} ${nama}`;
}

function normalizeRelation<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

@Injectable()
export class GuruService {
  constructor(private supabaseService: SupabaseService) { }

  // ==========================================
  // GET ALL GURU
  // ==========================================
  async findAll() {
    const supabase = this.supabaseService.getClient();

    const { data: guruList, error } = await supabase
      .from('guru')
      .select(
        `
        nip,
        nama,
        mata_pelajaran,
        peran,
        is_active,
        kelas_wali:kelas_wali_id (
          id, nama, tingkat
        )
      `,
      )
      .order('nama', { ascending: true });

    if (error) throw new BadRequestException('Gagal mengambil data guru');

    return {
      success: true,
      data: guruList.map((guru) => {
        const kelas = normalizeRelation(guru.kelas_wali as any);
        return {
          nip: guru.nip,
          nama: guru.nama,
          mataPelajaran: guru.mata_pelajaran ?? null,
          peran: guru.peran,
          kelasWali: kelas
            ? {
              id: kelas.id,
              nama: kelas.nama,
              tingkat: kelas.tingkat,
              label: formatKelasLabel(kelas.tingkat, kelas.nama),
            }
            : null,
          statusAktif: guru.is_active,
        };
      }),
    };
  }

  // ==========================================
  // GET GURU BY NIP
  // ==========================================
  async findOne(nip: string) {
    const supabase = this.supabaseService.getClient();

    const { data: guru, error } = await supabase
      .from('guru')
      .select(
        `
        nip, nama, mata_pelajaran, peran, is_active, created_at,
        kelas_wali:kelas_wali_id (id, nama, tingkat)
      `,
      )
      .eq('nip', nip)
      .single();

    if (error || !guru) throw new NotFoundException('Guru tidak ditemukan');

    const kelas = normalizeRelation(guru.kelas_wali as any);

    return {
      success: true,
      data: {
        nip: guru.nip,
        nama: guru.nama,
        mataPelajaran: guru.mata_pelajaran ?? null,
        peran: guru.peran,
        kelasWali: kelas
          ? {
            id: kelas.id,
            nama: kelas.nama,
            tingkat: kelas.tingkat,
            label: formatKelasLabel(kelas.tingkat, kelas.nama),
          }
          : null,
        statusAktif: guru.is_active,
        createdAt: guru.created_at,
      },
    };
  }

  // ==========================================
  // GET KELAS TERSEDIA (belum punya wali kelas)
  // ==========================================
  async getKelasTersedia(excludeKelasWaliId?: number) {
    const supabase = this.supabaseService.getClient();

    // Ambil kelas_wali_id yang sudah dipakai (kecuali kelas guru yg sedang diedit)
    const { data: guruDenganWali } = await supabase
      .from('guru')
      .select('kelas_wali_id')
      .eq('peran', 'wali_kelas')
      .not('kelas_wali_id', 'is', null);

    const usedIds = (guruDenganWali ?? [])
      .map((g) => g.kelas_wali_id)
      .filter((id) => id !== null && id !== excludeKelasWaliId);

    let query = supabase
      .from('kelas')
      .select('id, nama, tingkat')
      .order('tingkat', { ascending: true })
      .order('nama', { ascending: true });

    if (usedIds.length > 0) {
      query = query.not('id', 'in', `(${usedIds.join(',')})`);
    }

    const { data: kelasList, error } = await query;
    if (error)
      throw new BadRequestException('Gagal mengambil data kelas tersedia');

    return {
      success: true,
      data: (kelasList ?? []).map((k) => ({
        id: k.id,
        label: formatKelasLabel(k.tingkat, k.nama),
        tingkat: k.tingkat,
        nama: k.nama,
      })),
    };
  }

  // ==========================================
  // CREATE GURU
  // ==========================================
  async create(dto: CreateGuruDto) {
    const supabase = this.supabaseService.getClient();

    // Cek duplikat NIP
    const { data: existing } = await supabase
      .from('guru')
      .select('nip')
      .eq('nip', dto.nip)
      .single();

    if (existing) throw new ConflictException(`NIP ${dto.nip} sudah terdaftar`);

    // Validasi kelas jika wali_kelas
    if (dto.peran === 'wali_kelas') {
      if (!dto.kelasWaliId)
        throw new BadRequestException(
          'Kelas wali wajib diisi untuk peran wali kelas',
        );

      const { data: kelas } = await supabase
        .from('kelas')
        .select('id, nama, tingkat')
        .eq('id', dto.kelasWaliId)
        .single();

      if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');

      // Cek kelas belum punya wali lain
      const { data: existingWali } = await supabase
        .from('guru')
        .select('nip, nama')
        .eq('kelas_wali_id', dto.kelasWaliId)
        .eq('peran', 'wali_kelas')
        .single();

      if (existingWali) {
        throw new BadRequestException(
          `Kelas ${formatKelasLabel(kelas.tingkat, kelas.nama)} sudah memiliki wali kelas (${existingWali.nama})`,
        );
      }
    }

    // Hash password & insert
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { data: newGuru, error } = await supabase
      .from('guru')
      .insert([
        {
          nip: dto.nip,
          nama: dto.nama,
          password_hash: hashedPassword,
          mata_pelajaran: dto.mataPelajaran ?? null,
          peran: dto.peran,
          kelas_wali_id:
            dto.peran === 'wali_kelas' ? (dto.kelasWaliId ?? null) : null,
          is_active: dto.statusAktif ?? true,
        },
      ])
      .select('nip, nama, peran')
      .single();

    if (error) throw new BadRequestException('Gagal menambahkan guru');

    return {
      success: true,
      message: 'Guru berhasil ditambahkan',
      data: newGuru,
    };
  }

  // ==========================================
  // UPDATE GURU
  // ==========================================
  async update(nip: string, dto: UpdateGuruDto) {
    const supabase = this.supabaseService.getClient();

    // Cek guru exist
    const { data: existing } = await supabase
      .from('guru')
      .select('nip, nama, peran, kelas_wali_id')
      .eq('nip', nip)
      .single();

    if (!existing) throw new NotFoundException('Guru tidak ditemukan');

    // Resolusi peran efektif
    const effectivePeran = dto.peran ?? existing.peran;

    // Validasi kelas jika wali_kelas
    if (effectivePeran === 'wali_kelas') {
      const effectiveKelasId = dto.kelasWaliId ?? existing.kelas_wali_id;

      if (!effectiveKelasId)
        throw new BadRequestException(
          'Kelas wali wajib diisi untuk peran wali kelas',
        );

      const { data: kelas } = await supabase
        .from('kelas')
        .select('id, nama, tingkat')
        .eq('id', effectiveKelasId)
        .single();

      if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');

      // Cek wali kelas lain (exclude guru ini sendiri)
      const { data: existingWali } = await supabase
        .from('guru')
        .select('nip, nama')
        .eq('kelas_wali_id', effectiveKelasId)
        .eq('peran', 'wali_kelas')
        .neq('nip', nip)
        .single();

      if (existingWali) {
        throw new BadRequestException(
          `Kelas ${formatKelasLabel(kelas.tingkat, kelas.nama)} sudah memiliki wali kelas (${existingWali.nama})`,
        );
      }
    }

    // Siapkan update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.nama) updateData.nama = dto.nama;
    if (dto.mataPelajaran !== undefined)
      updateData.mata_pelajaran = dto.mataPelajaran;
    if (dto.peran) updateData.peran = dto.peran;
    if (dto.statusAktif !== undefined) updateData.is_active = dto.statusAktif;

    // Tentukan peran final
    const finalPeran = dto.peran ?? existing.peran;

    // Handle kelas_wali_id
    if (finalPeran === 'wali_kelas') {
      updateData.kelas_wali_id =
        dto.kelasWaliId ?? existing.kelas_wali_id ?? null;
    } else {
      updateData.kelas_wali_id = null;
    }

    // Hash password jika diisi
    if (dto.password) {
      updateData.password_hash = await bcrypt.hash(dto.password, 10);
    }

    const { error } = await supabase
      .from('guru')
      .update(updateData)
      .eq('nip', nip);
    if (error) throw new BadRequestException('Gagal mengupdate guru');

    return {
      success: true,
      message: `Data guru ${existing.nama} berhasil diupdate`,
    };
  }

  // ==========================================
  // DELETE GURU
  // ==========================================
  async remove(nip: string) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('guru')
      .select('nip, nama')
      .eq('nip', nip)
      .single();

    if (!existing) throw new NotFoundException('Guru tidak ditemukan');

    const { error } = await supabase.from('guru').delete().eq('nip', nip);
    if (error) throw new BadRequestException('Gagal menghapus guru');

    return {
      success: true,
      message: `Guru ${existing.nama} berhasil dihapus`,
    };
  }

  async updatePassword(nip: string, dto: UpdateGuruPasswordDto) {
    const supabase = this.supabaseService.getClient();

    if (!dto.passwordBaru || dto.passwordBaru.length < 6) {
      throw new BadRequestException('Password baru minimal 6 karakter');
    }

    const { data: guru, error } = await supabase
      .from('guru')
      .select('nip, password_hash')
      .eq('nip', nip)
      .maybeSingle();

    if (error || !guru) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    const valid = await bcrypt.compare(dto.passwordLama, guru.password_hash);
    if (!valid) {
      throw new BadRequestException('Password lama tidak sesuai');
    }

    const passwordHash = await bcrypt.hash(dto.passwordBaru, 10);
    const { error: updateError } = await supabase
      .from('guru')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('nip', nip);

    if (updateError) {
      throw new BadRequestException('Gagal mengubah password guru');
    }

    return {
      success: true,
      message: 'Password guru berhasil diubah',
    };
  }
}

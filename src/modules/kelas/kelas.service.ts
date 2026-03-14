import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateKelasDto } from './dto/create-kelas.dto';
import { UpdateKelasDto } from './dto/update-kelas.dto';

@Injectable()
export class KelasService {
  constructor(private supabaseService: SupabaseService) {}
  private jenjangColumn: 'jenjang' | 'jejang' = 'jenjang';
  private jenjangColumnResolved = false;

  private async resolveJenjangColumn(
    supabase: ReturnType<SupabaseService['getClient']>,
  ): Promise<'jenjang' | 'jejang'> {
    if (this.jenjangColumnResolved) return this.jenjangColumn;

    const { error } = await supabase.from('kelas').select('jenjang').limit(1);

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('jenjang') && msg.includes('does not exist')) {
        this.jenjangColumn = 'jejang';
      }
    }

    this.jenjangColumnResolved = true;
    return this.jenjangColumn;
  }

  private normalizeJenjang(value: unknown): 'SD' | 'SMP' | 'SMA' {
    const raw = String(value ?? '')
      .trim()
      .toUpperCase();

    if (raw !== 'SD' && raw !== 'SMP' && raw !== 'SMA') {
      throw new BadRequestException('Jenjang harus SD, SMP atau SMA');
    }

    return raw as 'SD' | 'SMP' | 'SMA';
  }

  private normalizeTingkat(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      throw new BadRequestException('Tingkat harus berupa angka bulat');
    }
    return parsed;
  }

  private validateJenjangTingkat(jenjang: 'SD' | 'SMP' | 'SMA', tingkat: number) {
    const validTingkatSD = [1, 2, 3, 4, 5, 6]; // Tambahkan ini
    const validTingkatSMP = [7, 8, 9];
    const validTingkatSMA = [10, 11, 12];
    
    let valid = false;
    if (jenjang === 'SD') valid = validTingkatSD.includes(tingkat);
    else if (jenjang === 'SMP') valid = validTingkatSMP.includes(tingkat);
    else if (jenjang === 'SMA') valid = validTingkatSMA.includes(tingkat);

    if (!valid) {
      throw new BadRequestException(
        `Tingkat ${tingkat} tidak valid untuk jenjang ${jenjang}`,
      );
    }
  }

  private mapSupabaseKelasError(error: any, fallback: string): never {
    const rawMessage = String(error?.message || '');
    const lowered = rawMessage.toLowerCase();

    if (
      lowered.includes('kelas_tingkat_check') ||
      (lowered.includes('check constraint') && lowered.includes('tingkat'))
    ) {
      throw new BadRequestException(
        'Constraint database menolak kombinasi tingkat dan jenjang tersebut. Pastikan SD(1-6), SMP(7-9), atau SMA(10-12).',
      );
    }

    throw new BadRequestException(rawMessage || fallback);
  }

  // ==========================================
  // GET ALL KELAS
  // ==========================================
  async findAll() {
    const supabase = this.supabaseService.getClient();
    const jenjangColumn = await this.resolveJenjangColumn(supabase);

    // Get all kelas
    const { data: kelasList, error } = await supabase
      .from('kelas')
      .select('*')
      .order('tingkat', { ascending: true })
      .order('nama', { ascending: true });

    if (error) {
      throw new BadRequestException('Gagal mengambil data kelas');
    }

    // Enrich each kelas with wali kelas and siswa
    const enrichedKelas = await Promise.all(
      kelasList.map(async (kelas) => {
        // Get wali kelas
        const { data: waliKelas } = await supabase
          .from('guru')
          .select('nip, nama, mata_pelajaran')
          .eq('kelas_wali_id', kelas.id)
          .eq('peran', 'wali_kelas')
          .single();

        // Get siswa count
        const { count: jumlahSiswa } = await supabase
          .from('siswa')
          .select('*', { count: 'exact', head: true })
          .eq('kelas_id', kelas.id)
          .eq('is_active', true);

        // Get all siswa in this class
        const { data: siswa } = await supabase
          .from('siswa')
          .select('nis, nama, coins')
          .eq('kelas_id', kelas.id)
          .eq('is_active', true)
          .order('nama', { ascending: true });

        return {
          id: kelas.id,
          nama: kelas.nama,
          jenjang: kelas[jenjangColumn],
          tingkat: kelas.tingkat,
          kapasitasMaksimal: kelas.kapasitas_maksimal,
          jumlahSiswa: jumlahSiswa || 0,
          waliKelas: waliKelas || null,
          siswa: siswa || [],
          createdAt: kelas.created_at,
          updatedAt: kelas.updated_at,
        };
      }),
    );

    return {
      success: true,
      data: enrichedKelas,
    };
  }

  // ==========================================
  // GET KELAS BY ID
  // ==========================================
  async findOne(id: number) {
    const supabase = this.supabaseService.getClient();
    const jenjangColumn = await this.resolveJenjangColumn(supabase);

    // Get kelas
    const { data: kelas, error } = await supabase
      .from('kelas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !kelas) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    // Get wali kelas
    const { data: waliKelas } = await supabase
      .from('guru')
      .select('nip, nama, mata_pelajaran, peran')
      .eq('kelas_wali_id', id)
      .eq('peran', 'wali_kelas')
      .single();

    // Get siswa count
    const { count: jumlahSiswa } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('kelas_id', id)
      .eq('is_active', true);

    // Get all siswa
    const { data: siswa } = await supabase
      .from('siswa')
      .select('nis, nama, coins, streak')
      .eq('kelas_id', id)
      .eq('is_active', true)
      .order('nama', { ascending: true });

    return {
      success: true,
      data: {
        id: kelas.id,
        nama: kelas.nama,
        jenjang: kelas[jenjangColumn],
        tingkat: kelas.tingkat,
        kapasitasMaksimal: kelas.kapasitas_maksimal,
        jumlahSiswa: jumlahSiswa || 0,
        waliKelas: waliKelas || null,
        siswa: siswa || [],
        createdAt: kelas.created_at,
        updatedAt: kelas.updated_at,
      },
    };
  }

  // ==========================================
  // CREATE KELAS
  // ==========================================
  async create(createKelasDto: CreateKelasDto) {
    const supabase = this.supabaseService.getClient();
    const jenjangColumn = await this.resolveJenjangColumn(supabase);

    const nama = createKelasDto.nama;
    const jenjang = this.normalizeJenjang(createKelasDto.jenjang);
    const tingkat = this.normalizeTingkat(createKelasDto.tingkat);
    const kapasitasMaksimal = createKelasDto.kapasitasMaksimal;

    this.validateJenjangTingkat(jenjang, tingkat);

    // Check if kelas name already exists for this tingkat
    const { data: existing } = await supabase
      .from('kelas')
      .select('id')
      .eq('nama', nama)
      .eq(jenjangColumn, jenjang)
      .eq('tingkat', tingkat)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        `Kelas ${nama} untuk tingkat ${tingkat} sudah ada`,
      );
    }

    // Insert new kelas
    const { data: newKelas, error } = await supabase
      .from('kelas')
      .insert([
        {
          nama,
          [jenjangColumn]: jenjang,
          tingkat,
          kapasitas_maksimal: kapasitasMaksimal,
        },
      ])
      .select()
      .single();

    if (error) {
      this.mapSupabaseKelasError(error, 'Gagal membuat kelas');
    }

    return {
      success: true,
      message: 'Kelas berhasil dibuat',
      data: {
        id: newKelas.id,
        nama: newKelas.nama,
        jenjang: newKelas[jenjangColumn],
        tingkat: newKelas.tingkat,
        kapasitasMaksimal: newKelas.kapasitas_maksimal,
        jumlahSiswa: 0,
        waliKelas: null,
        createdAt: newKelas.created_at,
      },
    };
  }

  // ==========================================
  // UPDATE KELAS
  // ==========================================
  async update(id: number, updateKelasDto: UpdateKelasDto) {
    const supabase = this.supabaseService.getClient();
    const jenjangColumn = await this.resolveJenjangColumn(supabase);

    // Check if kelas exists
    const { data: existing } = await supabase
      .from('kelas')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    const nextNama = updateKelasDto.nama ?? existing.nama;
    const nextJenjang = this.normalizeJenjang(
      updateKelasDto.jenjang ?? existing[jenjangColumn],
    );
    const nextTingkat = this.normalizeTingkat(
      updateKelasDto.tingkat ?? existing.tingkat,
    );

    this.validateJenjangTingkat(nextJenjang, nextTingkat);

    // Check if new identity conflicts
    if (updateKelasDto.nama || updateKelasDto.jenjang || updateKelasDto.tingkat) {
      const { data: conflict } = await supabase
        .from('kelas')
        .select('id')
        .eq('nama', nextNama)
        .eq(jenjangColumn, nextJenjang)
        .eq('tingkat', nextTingkat)
        .neq('id', id)
        .maybeSingle();

      if (conflict) {
        throw new BadRequestException('Nama kelas sudah digunakan');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateKelasDto.nama) updateData.nama = updateKelasDto.nama;
    if (updateKelasDto.jenjang) {
      updateData[jenjangColumn] = this.normalizeJenjang(updateKelasDto.jenjang);
    }
    if (updateKelasDto.tingkat !== undefined) {
      updateData.tingkat = this.normalizeTingkat(updateKelasDto.tingkat);
    }
    if (updateKelasDto.kapasitasMaksimal) {
      updateData.kapasitas_maksimal = updateKelasDto.kapasitasMaksimal;
    }
    updateData.updated_at = new Date().toISOString();

    // Update kelas
    const { data: updated, error } = await supabase
      .from('kelas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.mapSupabaseKelasError(error, 'Gagal mengupdate kelas');
    }

    // Get jumlah siswa
    const { count: jumlahSiswa } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('kelas_id', id)
      .eq('is_active', true);

    return {
      success: true,
      message: 'Kelas berhasil diupdate',
      data: {
        id: updated.id,
        nama: updated.nama,
        jenjang: updated[jenjangColumn],
        tingkat: updated.tingkat,
        kapasitasMaksimal: updated.kapasitas_maksimal,
        jumlahSiswa: jumlahSiswa || 0,
        updatedAt: updated.updated_at,
      },
    };
  }

  // ==========================================
  // DELETE KELAS
  // ==========================================
  async remove(id: number) {
    const supabase = this.supabaseService.getClient();

    // Check if kelas exists
    const { data: existing } = await supabase
      .from('kelas')
      .select('id, nama')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    // Check if kelas has students
    const { count: jumlahSiswa } = await supabase
      .from('siswa')
      .select('*', { count: 'exact', head: true })
      .eq('kelas_id', id)
      .eq('is_active', true);

    if (jumlahSiswa && jumlahSiswa > 0) {
      throw new BadRequestException(
        `Tidak dapat menghapus kelas ${existing.nama} yang masih memiliki ${jumlahSiswa} siswa aktif`,
      );
    }

    // Delete kelas
    const { error } = await supabase.from('kelas').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Gagal menghapus kelas');
    }

    return {
      success: true,
      message: `Kelas ${existing.nama} berhasil dihapus`,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VoucherService {
  constructor(private supabaseService: SupabaseService) { }

  // ==========================================
  // HELPER: FORMAT TANGGAL & ROMAWI
  // ==========================================
  private toRoman(num: number | string): string {
    const n = Number(num);
    if (isNaN(n)) return String(num);
    const romanMap: { [key: number]: string } = {
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
      7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
    };
    return romanMap[n] || String(n);
  }

  private formatDateIndo(dateStr: string | Date | null | undefined): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ==========================================
  // HELPER: AUTO-GENERATE KODE VOUCHER
  // ==========================================
  private async generateKodeVoucher(): Promise<string> {
    const supabase = this.supabaseService.getClient();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 char

    let kode = `VCH-${date}-${random}`;
    let attempt = 0;

    // Ensure unique (retry jika duplikat)
    while (attempt < 10) {
      const { data } = await supabase
        .from('voucher')
        .select('id')
        .eq('kode_voucher', kode)
        .single();

      if (!data) return kode; // Kode unik

      // Generate ulang
      kode = `VCH-${date}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      attempt++;
    }

    throw new BadRequestException('Gagal generate kode voucher unik');
  }

  // ==========================================
  // GET ALL VOUCHER + STATS
  // ==========================================
  async findAll() {
    const supabase = this.supabaseService.getClient();

    const { data: voucherList, error } = await supabase
      .from('voucher')
      .select(`
        id,
        kode_voucher,
        nama_voucher,
        tanggal_berlaku,
        tanggal_berakhir,
        nominal_voucher,
        tipe_voucher,
        status,
        used_at,
        created_at,
        siswa:nis (nis, nama, kelas:kelas_id (id, nama, tingkat))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Gagal mengambil data voucher');
    }

    // Format response
    const formatted = voucherList.map((v) => {
      const siswa = Array.isArray(v.siswa) ? v.siswa[0] : v.siswa;
      const kelas = siswa?.kelas
        ? Array.isArray(siswa.kelas)
          ? siswa.kelas[0]
          : siswa.kelas
        : null;

      return {
        id: v.id,
        kodeVoucher: v.kode_voucher,
        namaVoucher: v.nama_voucher,
        tanggalBerlaku: v.tanggal_berlaku,
        tanggalBerakhir: v.tanggal_berakhir,
        penerima: siswa
          ? {
            nis: siswa.nis,
            nama: siswa.nama,
            kelas: kelas ? `${this.toRoman(kelas.tingkat)} ${kelas.nama}` : null,
          }
          : null,
        nominalVoucher: v.nominal_voucher,
        tipeVoucher: v.tipe_voucher,
        status: v.status,
        usedAt: v.used_at,
        createdAt: v.created_at,
      };
    });

    // Calculate stats
    const stats = {
      tersedia: formatted.filter((v) => v.status === 'available').length,
      sudahDitukar: formatted.filter((v) => v.status === 'used').length,
      kadaluarsa: formatted.filter((v) => v.status === 'expired').length,
    };

    return {
      success: true,
      data: {
        vouchers: formatted,
        stats,
      },
    };
  }

  // ==========================================
  // GET DROPDOWN SISWA (A-Z)
  // ==========================================
  async getSiswaDropdown() {
    const supabase = this.supabaseService.getClient();

    const { data: siswaList, error } = await supabase
      .from('siswa')
      .select('nis, nama, kelas:kelas_id (id, nama, tingkat)')
      .eq('is_active', true)
      .order('nama', { ascending: true }); // A-Z

    if (error) {
      throw new BadRequestException('Gagal mengambil data siswa');
    }

    const formatted = siswaList.map((s) => {
      const kelas = s.kelas
        ? Array.isArray(s.kelas)
          ? s.kelas[0]
          : s.kelas
        : null;

      return {
        nis: s.nis,
        nama: s.nama,
        kelas: kelas ? `${this.toRoman(kelas.tingkat)}-${kelas.nama}` : null,
      };
    });

    return {
      success: true,
      data: formatted,
    };
  }

  // ==========================================
  // GET VOUCHER BY ID
  // ==========================================
  async findOne(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: voucher, error } = await supabase
      .from('voucher')
      .select(`
        id, kode_voucher, nama_voucher, tanggal_berlaku, tanggal_berakhir,
        nominal_voucher, tipe_voucher, status, used_at, created_at,
        siswa:nis (nis, nama, kelas:kelas_id (id, nama, tingkat))
      `)
      .eq('id', id)
      .single();

    if (error || !voucher) {
      throw new NotFoundException('Voucher tidak ditemukan');
    }

    const siswa = Array.isArray(voucher.siswa)
      ? voucher.siswa[0]
      : voucher.siswa;
    const kelas = siswa?.kelas
      ? Array.isArray(siswa.kelas)
        ? siswa.kelas[0]
        : siswa.kelas
      : null;

    return {
      success: true,
      data: {
        id: voucher.id,
        kodeVoucher: voucher.kode_voucher,
        namaVoucher: voucher.nama_voucher,
        tanggalBerlaku: voucher.tanggal_berlaku,
        tanggalBerakhir: voucher.tanggal_berakhir,
        penerima: siswa
          ? {
            nis: siswa.nis,
            nama: siswa.nama,
            kelas: kelas ? `${this.toRoman(kelas.tingkat)}-${kelas.nama}` : null,
          }
          : null,
        nominalVoucher: voucher.nominal_voucher,
        tipeVoucher: voucher.tipe_voucher,
        status: voucher.status,
        usedAt: voucher.used_at,
        createdAt: voucher.created_at,
      },
    };
  }

  // ==========================================
  // CREATE VOUCHER
  // ==========================================
  async create(dto: CreateVoucherDto, createdBy?: number) {
    const supabase = this.supabaseService.getClient();

    // Validasi tanggal
    const berlaku = new Date(dto.tanggalBerlaku);
    const berakhir = new Date(dto.tanggalBerakhir);

    if (berakhir <= berlaku) {
      throw new BadRequestException(
        'Tanggal berakhir harus lebih besar dari tanggal berlaku',
      );
    }

    // Cek siswa exist
    const { data: siswa } = await supabase
      .from('siswa')
      .select('nis, nama')
      .eq('nis', dto.nis)
      .eq('is_active', true)
      .single();

    if (!siswa) {
      throw new NotFoundException('Siswa tidak ditemukan atau tidak aktif');
    }

    // Generate kode unik
    const kodeVoucher = await this.generateKodeVoucher();

    // Insert voucher
    const { data: newVoucher, error } = await supabase
      .from('voucher')
      .insert([
        {
          kode_voucher: kodeVoucher,
          nama_voucher: dto.namaVoucher,
          tanggal_berlaku: dto.tanggalBerlaku,
          tanggal_berakhir: dto.tanggalBerakhir,
          nis: dto.nis,
          nominal_voucher: dto.nominalVoucher,
          tipe_voucher: dto.tipeVoucher,
          status: dto.status || 'available',
          created_by: createdBy || null,
        },
      ])
      .select('id, kode_voucher, nama_voucher')
      .single();

    if (error) {
      throw new BadRequestException('Gagal membuat voucher');
    }

    return {
      success: true,
      message: `Voucher ${newVoucher.nama_voucher} berhasil dibuat`,
      data: {
        id: newVoucher.id,
        kodeVoucher: newVoucher.kode_voucher,
        namaVoucher: newVoucher.nama_voucher,
      },
    };
  }

  // ==========================================
  // UPDATE VOUCHER (kecuali kode)
  // ==========================================
  async update(id: number, dto: UpdateVoucherDto) {
    const supabase = this.supabaseService.getClient();

    // Cek voucher exist
    const { data: existing } = await supabase
      .from('voucher')
      .select('id, nama_voucher')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Voucher tidak ditemukan');
    }

    // Validasi tanggal (jika ada)
    if (dto.tanggalBerlaku && dto.tanggalBerakhir) {
      const berlaku = new Date(dto.tanggalBerlaku);
      const berakhir = new Date(dto.tanggalBerakhir);

      if (berakhir <= berlaku) {
        throw new BadRequestException(
          'Tanggal berakhir harus lebih besar dari tanggal berlaku',
        );
      }
    }

    // Cek siswa exist (jika update)
    if (dto.nis) {
      const { data: siswa } = await supabase
        .from('siswa')
        .select('nis')
        .eq('nis', dto.nis)
        .eq('is_active', true)
        .single();

      if (!siswa) {
        throw new NotFoundException('Siswa tidak ditemukan atau tidak aktif');
      }
    }

    // Siapkan update data
    const updateData: Record<string, any> = {};

    if (dto.namaVoucher) updateData.nama_voucher = dto.namaVoucher;
    if (dto.tanggalBerlaku) updateData.tanggal_berlaku = dto.tanggalBerlaku;
    if (dto.tanggalBerakhir) updateData.tanggal_berakhir = dto.tanggalBerakhir;
    if (dto.nis) updateData.nis = dto.nis;
    if (dto.nominalVoucher) updateData.nominal_voucher = dto.nominalVoucher;
    if (dto.tipeVoucher) updateData.tipe_voucher = dto.tipeVoucher;
    if (dto.status) updateData.status = dto.status;

    // Update
    const { error } = await supabase
      .from('voucher')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new BadRequestException('Gagal mengupdate voucher');
    }

    return {
      success: true,
      message: `Voucher ${existing.nama_voucher} berhasil diupdate`,
    };
  }

  // ==========================================
  // DELETE VOUCHER
  // ==========================================
  async remove(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('voucher')
      .select('id, nama_voucher')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Voucher tidak ditemukan');
    }

    const { error } = await supabase.from('voucher').delete().eq('id', id);

    if (error) {
      throw new BadRequestException('Gagal menghapus voucher');
    }

    return {
      success: true,
      message: `Voucher ${existing.nama_voucher} berhasil dihapus`,
    };
  }
}

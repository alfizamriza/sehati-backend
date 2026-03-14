import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreatePelanggaranDto } from './dto/create-pelanggaran.dto';

// ─── HELPER ───────────────────────────────────────────────────────────────────
function toRomawi(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
    [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ];
  let result = '';
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

function formatKelasLabel(tingkat: number, nama: string): string {
  return `${toRomawi(tingkat)} ${nama}`;
}

/**
 * Kembalikan { tanggal, waktu } dalam WIB (UTC+7).
 *
 * FIX: new Date().toISOString() → UTC → tanggal bisa meleset 1 hari
 *      (misal jam 00:30 WIB → toISOString() = '...T17:30Z' = tanggal kemarin)
 */
function nowWIB(): { tanggal: string; waktu: string; iso: string } {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const iso  = wib.toISOString();
  const tanggal = iso.split('T')[0];                          // 'YYYY-MM-DD'
  const waktu   = iso.split('T')[1].split('.')[0];            // 'HH:MM:SS'
  return { tanggal, waktu, iso: iso.replace('Z', '+07:00') };
}

@Injectable()
export class PelanggaranService {
  constructor(private supabaseService: SupabaseService) {}

  // =====================================================
  // GET KELAS LIST
  // =====================================================
  async getKelasList() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('kelas')
      .select('id, nama, tingkat, jenjang')
      .order('tingkat', { ascending: true })
      .order('nama',    { ascending: true });

    if (error) throw new BadRequestException('Gagal mengambil daftar kelas');
    return {
      success: true,
      data: (data || []).map((k) => ({
        id: k.id, nama: k.nama, tingkat: k.tingkat, jenjang: k.jenjang,
        label: formatKelasLabel(k.tingkat, k.nama),
      })),
    };
  }

  // =====================================================
  // GET SISWA BY KELAS
  // =====================================================
  async getSiswaByKelas(kelasId: number) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('siswa')
      .select('nis, nama')
      .eq('kelas_id', kelasId)
      .eq('is_active', true)
      .order('nama', { ascending: true });

    if (error) throw new BadRequestException('Gagal mengambil data siswa');
    return { success: true, data: data || [] };
  }

  // =====================================================
  // GET JENIS PELANGGARAN AKTIF
  // =====================================================
  async getJenisPelanggaranAktif() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('jenis_pelanggaran')
      .select('id, nama, kategori, bobot_coins, deskripsi')
      .eq('is_active', true)
      .order('kategori', { ascending: true })
      .order('nama',     { ascending: true });

    if (error) throw new BadRequestException('Gagal mengambil jenis pelanggaran');
    return { success: true, data: data || [] };
  }

  // =====================================================
  // CREATE PELANGGARAN
  // =====================================================
  async createPelanggaran(dto: CreatePelanggaranDto, nipGuru: string) {
    const supabase = this.supabaseService.getClient();

    const { data: guru, error: guruError } = await supabase
      .from('guru').select('nip, nama, peran')
      .eq('nip', nipGuru).eq('is_active', true).maybeSingle();
    if (guruError || !guru) throw new UnauthorizedException('Data guru tidak ditemukan');

    const { data: siswa, error: siswaError } = await supabase
      .from('siswa').select('nis, nama, coins')
      .eq('nis', dto.nis).eq('is_active', true).maybeSingle();
    if (siswaError || !siswa) throw new BadRequestException('Siswa tidak ditemukan atau tidak aktif');

    const { data: jenis, error: jenisError } = await supabase
      .from('jenis_pelanggaran').select('id, nama, kategori, bobot_coins')
      .eq('id', dto.jenis_pelanggaran_id).eq('is_active', true).maybeSingle();
    if (jenisError || !jenis) throw new BadRequestException('Jenis pelanggaran tidak ditemukan atau tidak aktif');

    // ✅ FIX: gunakan waktu WIB, bukan UTC
    const { tanggal, waktu } = nowWIB();

    const { data: created, error: insertError } = await supabase
      .from('pelanggaran')
      .insert([{
        nis: dto.nis,
        nip: nipGuru,
        jenis_pelanggaran_id: dto.jenis_pelanggaran_id,
        tanggal,                    // ← WIB ✅
        waktu,                      // ← WIB ✅
        coins_penalty: jenis.bobot_coins,
        catatan: dto.catatan?.trim() || null,
        bukti_foto_url: dto.bukti_foto_url || null,
        status: 'pending',
      }])
      .select(`
        id, status, tanggal, waktu, coins_penalty, catatan, bukti_foto_url,
        siswa:nis (nis, nama),
        jenis_pelanggaran:jenis_pelanggaran_id (id, nama, kategori, bobot_coins),
        guru:nip (nip, nama)
      `)
      .single();

    if (insertError) throw new BadRequestException(`Gagal mencatat pelanggaran: ${insertError.message}`);

    const siswaData = Array.isArray(created.siswa)             ? created.siswa[0]             : created.siswa;
    const jenisData = Array.isArray(created.jenis_pelanggaran) ? created.jenis_pelanggaran[0] : created.jenis_pelanggaran;
    const guruData  = Array.isArray(created.guru)              ? created.guru[0]              : created.guru;

    return {
      success: true,
      message: `Pelanggaran "${jenis.nama}" untuk ${siswa.nama} berhasil dicatat`,
      data: {
        id: created.id, tanggal: created.tanggal, waktu: created.waktu,
        status: created.status, coinspenalty: created.coins_penalty,
        catatan: created.catatan, buktiUrl: created.bukti_foto_url,
        siswa:            { nis: siswaData?.nis,  nama: siswaData?.nama },
        jenisPelanggaran: { id: jenisData?.id,    nama: jenisData?.nama, kategori: jenisData?.kategori },
        guru:             { nip: guruData?.nip,   nama: guruData?.nama },
      },
    };
  }

  // =====================================================
  // UPDATE BUKTI FOTO URL
  // =====================================================
  async updateBuktiFoto(pelanggaranId: number, buktiUrl: string, nipGuru: string) {
    const supabase = this.supabaseService.getClient();

    const { data: existing, error: fetchError } = await supabase
      .from('pelanggaran').select('id, nip, status')
      .eq('id', pelanggaranId).maybeSingle();

    if (fetchError || !existing) throw new BadRequestException('Pelanggaran tidak ditemukan');
    if (existing.nip !== nipGuru) throw new UnauthorizedException('Anda tidak berhak mengubah pelanggaran ini');

    const { data, error } = await supabase
      .from('pelanggaran').update({ bukti_foto_url: buktiUrl })
      .eq('id', pelanggaranId).select('id, bukti_foto_url').single();

    if (error) throw new BadRequestException('Gagal update bukti foto');
    return { success: true, data };
  }

  // =====================================================
  // GET RIWAYAT PELANGGARAN OLEH GURU SENDIRI
  // =====================================================
  async getRiwayatByGuru(nipGuru: string, limit = 100) {
    const supabase = this.supabaseService.getClient();
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const { data, error } = await supabase
      .from('pelanggaran')
      .select(`
        id, status, tanggal, coins_penalty, catatan, bukti_foto_url,
        siswa:nis (nis, nama, kelas:kelas_id (nama, tingkat)),
        jenis_pelanggaran:jenis_pelanggaran_id (id, nama, kategori)
      `)
      .eq('nip', nipGuru)
      .order('tanggal',    { ascending: false })
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) throw new BadRequestException('Gagal mengambil riwayat pelanggaran');

    return {
      success: true,
      data: (data || []).map((p) => {
        const siswa = Array.isArray(p.siswa) ? p.siswa[0] : p.siswa;
        const kelas = siswa?.kelas ? (Array.isArray(siswa.kelas) ? siswa.kelas[0] : siswa.kelas) : null;
        const jenis = Array.isArray(p.jenis_pelanggaran) ? p.jenis_pelanggaran[0] : p.jenis_pelanggaran;
        return {
          id:           p.id,
          tanggal:      p.tanggal,
          status:       p.status,
          coinspenalty: Math.abs(p.coins_penalty || 0),
          catatan:      p.catatan,
          buktiUrl:     p.bukti_foto_url,
          siswa: {
            nis:        siswa?.nis  ?? '-',
            nama:       siswa?.nama ?? '-',
            kelasLabel: kelas ? formatKelasLabel(kelas.tingkat, kelas.nama) : '-',
          },
          jenisPelanggaran: {
            id:       jenis?.id,
            nama:     jenis?.nama     ?? '-',
            kategori: jenis?.kategori ?? '-',
          },
        };
      }),
    };
  }

  // =====================================================
  // UPDATE PELANGGARAN (edit jenis & catatan)
  // =====================================================
  async updatePelanggaran(
    id: number,
    dto: { jenis_pelanggaran_id?: number; catatan?: string },
    nipGuru: string,
  ) {
    const supabase = this.supabaseService.getClient();

    const { data: existing, error: fetchError } = await supabase
      .from('pelanggaran').select('id, nip, status')
      .eq('id', id).maybeSingle();

    if (fetchError || !existing) throw new BadRequestException('Pelanggaran tidak ditemukan');
    if (existing.nip !== nipGuru)      throw new UnauthorizedException('Anda tidak berhak mengubah laporan ini');
    if (existing.status !== 'pending') throw new BadRequestException('Laporan yang sudah diproses tidak dapat diubah');

    const updateData: Record<string, any> = {};

    if (dto.jenis_pelanggaran_id !== undefined) {
      const { data: jenis } = await supabase
        .from('jenis_pelanggaran').select('id, bobot_coins')
        .eq('id', dto.jenis_pelanggaran_id).eq('is_active', true).maybeSingle();
      if (!jenis) throw new BadRequestException('Jenis pelanggaran tidak ditemukan atau tidak aktif');
      updateData.jenis_pelanggaran_id = dto.jenis_pelanggaran_id;
      updateData.coins_penalty        = jenis.bobot_coins;
    }

    if (dto.catatan !== undefined) {
      updateData.catatan = dto.catatan?.trim() || null;
    }

    const { data, error } = await supabase
      .from('pelanggaran').update(updateData)
      .eq('id', id)
      .select('id, status, jenis_pelanggaran_id, coins_penalty, catatan')
      .single();

    if (error) throw new BadRequestException('Gagal mengupdate laporan');
    return { success: true, data };
  }

  // =====================================================
  // DELETE PELANGGARAN
  // =====================================================
  async deletePelanggaran(id: number, nipGuru: string) {
    const supabase = this.supabaseService.getClient();

    const { data: existing, error: fetchError } = await supabase
      .from('pelanggaran').select('id, nip, status')
      .eq('id', id).maybeSingle();

    if (fetchError || !existing) throw new BadRequestException('Pelanggaran tidak ditemukan');
    if (existing.nip !== nipGuru)      throw new UnauthorizedException('Anda tidak berhak menghapus laporan ini');
    if (existing.status !== 'pending') throw new BadRequestException('Laporan yang sudah diproses tidak dapat dihapus');

    const { error } = await supabase.from('pelanggaran').delete().eq('id', id);
    if (error) throw new BadRequestException('Gagal menghapus laporan');
    return { success: true, message: 'Laporan berhasil dihapus' };
  }
}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateIzinDto } from './dto/create-izin.dto';
import { CreateBatchIzinDto } from './dto/create-batch-izin.dto';
import { UpdateIzinStatusDto } from './dto/update-izin-status.dto';

@Injectable()
export class IzinService {
  constructor(private supabaseService: SupabaseService) { }

  /**
   * List siswa yang belum absen tumbler pada tanggal tertentu di kelas tertentu.
   * Digunakan frontend untuk menampilkan checklist siswa.
   */
  async listSiswaBelumAbsen(kelasId: number, tanggal: string) {
    const supabase = this.supabaseService.getClient();

    // Ambil semua siswa aktif di kelas
    const { data: siswaList, error: errSiswa } = await supabase
      .from('siswa')
      .select('nis, nama')
      .eq('kelas_id', kelasId)
      .eq('is_active', true)
      .order('nama');

    if (errSiswa) throw new BadRequestException(errSiswa.message);
    if (!siswaList || siswaList.length === 0) return [];

    const nisList = siswaList.map((s) => s.nis);

    // Ambil yang sudah absen tumbler pada tanggal tersebut
    const { data: sudahAbsen, error: errAbsen } = await supabase
      .from('absensi_tumbler')
      .select('nis')
      .eq('tanggal', tanggal)
      .in('nis', nisList);

    if (errAbsen) throw new BadRequestException(errAbsen.message);

    const sudahAbsenSet = new Set((sudahAbsen || []).map((a) => a.nis));

    // Ambil yang sudah ada izin pada tanggal tersebut (status apapun)
    const { data: sudahIzin, error: errIzin } = await supabase
      .from('siswa_izin')
      .select('nis')
      .eq('tanggal', tanggal)
      .in('nis', nisList);

    if (errIzin) throw new BadRequestException(errIzin.message);

    const sudahIzinSet = new Set((sudahIzin || []).map((i) => i.nis));

    // Filter: tampilkan hanya yang belum absen DAN belum ada izin
    return siswaList.filter(
      (s) => !sudahAbsenSet.has(s.nis) && !sudahIzinSet.has(s.nis),
    );
  }

  /**
   * List semua kelas (untuk dropdown pemilih kelas)
   */
  async listKelas() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('kelas')
      .select('id, nama, tingkat, jenjang')
      .order('jenjang')
      .order('tingkat')
      .order('nama');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async list(params: { status?: string; from?: string; to?: string }) {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('siswa_izin')
      .select(`
        id, nis, tanggal, tipe, status, catatan, created_at, updated_at,
        siswa:nis ( nama, kelas:kelas_id ( nama ) )
      `);

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    if (params.from) query = query.gte('tanggal', params.from);
    if (params.to) query = query.lte('tanggal', params.to);

    const { data, error } = await query.order('tanggal', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      nis: row.nis,
      tanggal: row.tanggal,
      tipe: row.tipe,
      status: row.status,
      catatan: row.catatan,
      created_at: row.created_at,
      updated_at: row.updated_at,
      siswa_nama: row.siswa?.nama ?? null,
      kelas_label: row.siswa?.kelas?.nama ?? null,
    }));
  }

  /** Single create — status langsung approved */
  async create(dto: CreateIzinDto) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('siswa_izin').insert([{
      nis: dto.nis,
      tanggal: dto.tanggal,
      tipe: dto.tipe,
      catatan: dto.catatan ?? null,
      status: 'approved', // ← langsung approved
    }]);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  /** Batch create — insert beberapa siswa sekaligus, semua langsung approved */
  async createBatch(dto: CreateBatchIzinDto) {
    const supabase = this.supabaseService.getClient();

    if (!dto.nis_list || dto.nis_list.length === 0) {
      throw new BadRequestException('nis_list tidak boleh kosong');
    }

    const rows = dto.nis_list.map((nis) => ({
      nis,
      tanggal: dto.tanggal,
      tipe: dto.tipe,
      catatan: dto.catatan ?? null,
      status: 'approved', // ← langsung approved
    }));

    const { error } = await supabase.from('siswa_izin').insert(rows);
    if (error) throw new BadRequestException(error.message);

    return { success: true, count: rows.length };
  }

  async updateStatus(id: number, dto: UpdateIzinStatusDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('siswa_izin')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) throw new NotFoundException('Izin tidak ditemukan');

    const { error } = await supabase
      .from('siswa_izin')
      .update({ status: dto.status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
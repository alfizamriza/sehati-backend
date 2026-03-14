import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { CreateSiswaDto } from './dto/create-siswa.dto';
import { UpdateSiswaDto } from './dto/update-siswa.dto';
import { StreakService } from 'src/modules/streak/streak.service';
import * as bcrypt from 'bcrypt';

type UploadedExcelFile = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
};

type KelasData = {
  id: number;
  nama: string;
  tingkat: string;
};

type KelasRelation = KelasData | KelasData[] | null;

@Injectable()
export class SiswaService {
  constructor(
    private supabaseService: SupabaseService,
    private streakService: StreakService,
  ) { }

  private normalizeKelas(kelas: KelasRelation): KelasData | null {
    if (!kelas) {
      return null;
    }
    return Array.isArray(kelas) ? (kelas[0] ?? null) : kelas;
  }

  private normalizeTingkat(value: string): string {
    const raw = value.trim().toUpperCase();
    const romanToNumber: Record<string, string> = {
      I: '1',
      II: '2',
      III: '3',
      IV: '4',
      V: '5',
      VI: '6',
      VII: '7',
      VIII: '8',
      IX: '9',
      X: '10',
      XI: '11',
      XII: '12',
    };

    return romanToNumber[raw] ?? value.trim();
  }

  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  async generateImportTemplate(): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    let ExcelJS: any;
    try {
      ExcelJS = require('exceljs');
    } catch {
      const csvRows = [
        [
          'NIS',
          'Nama Lengkap',
          'Tingkat',
          'Nama Kelas',
          'Password',
          'Status Aktif',
        ],
        ['1234567890', 'Ahmad Fauzi', '11', 'RPL', 'siswa123', 'TRUE'],
        ['1234567891', 'Siti Nurhaliza', 'VIII', 'A', 'siswa123', 'TRUE'],
        ['1234567892', 'Budi Santoso', '', '', 'siswa123', 'FALSE'],
      ];
      const csv =
        '\uFEFF' +
        csvRows
          .map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
          )
          .join('\n');
      return {
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'template_import_siswa.csv',
        contentType: 'text/csv; charset=utf-8',
      };
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Import Siswa');

    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 22 },
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'Tingkat', key: 'tingkat', width: 12 },
      { header: 'Nama Kelas', key: 'namaKelas', width: 20 },
      { header: 'Password', key: 'password', width: 18 },
      { header: 'Status Aktif', key: 'statusAktif', width: 14 },
    ];

    worksheet.addRows([
      {
        nis: '1234567890',
        nama: 'Ahmad Fauzi',
        tingkat: '11',
        namaKelas: 'RPL',
        password: 'siswa123',
        statusAktif: 'TRUE',
      },
      {
        nis: '1234567891',
        nama: 'Siti Nurhaliza',
        tingkat: 'VIII',
        namaKelas: 'A',
        password: 'siswa123',
        statusAktif: 'TRUE',
      },
      {
        nis: '1234567892',
        nama: 'Budi Santoso',
        tingkat: '',
        namaKelas: '',
        password: 'siswa123',
        statusAktif: 'FALSE',
      },
    ]);

    worksheet.addRow([]);
    worksheet.addRows([
      { nis: 'CATATAN PENTING:' },
      { nis: '1) Jangan ubah urutan kolom.' },
      { nis: '2) NIS wajib unik dan panjang 10-20 karakter.' },
      { nis: '3) Status Aktif hanya TRUE atau FALSE.' },
      {
        nis: '4) Isi Kelas ID jika tahu ID kelas. Jika tidak, isi Tingkat + Nama Kelas yang sesuai master.',
      },
      { nis: '5) Tingkat boleh angka (7-12) atau romawi (VII-XII).' },
    ]);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: 'template_import_siswa.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ==========================================
  // GET ALL SISWA
  // ==========================================
  async findAll() {
    const supabase = this.supabaseService.getClient();

    const { data: siswaList, error } = await supabase
      .from('siswa')
      .select(`
        nis,
        nama,
        coins,
        streak,
        is_active,
        created_at,
        kelas:kelas_id (
          id,
          nama,
          tingkat
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Gagal mengambil data siswa');
    }

    // Format response
    const formatted = await Promise.all(siswaList.map(async (siswa) => {
      const kelas = this.normalizeKelas(siswa.kelas as KelasRelation);
      const streakData = await this.streakService.calculateStreak(siswa.nis);
      return {
        nis: siswa.nis,
        nama: siswa.nama,
        kelas: kelas ? `${kelas.tingkat} ${kelas.nama}` : '-',
        kelasId: kelas?.id ?? null,
        statusAktif: siswa.is_active,
        coins: siswa.coins,
        streak: streakData.currentStreak,
        createdAt: siswa.created_at,
      };
    }));

    return {
      success: true,
      data: formatted,
    };
  }

  // ==========================================
  // GET SISWA BY NIS
  // ==========================================
  async findOne(nis: string) {
    const supabase = this.supabaseService.getClient();

    const { data: siswa, error } = await supabase
      .from('siswa')
      .select(`
        nis,
        nama,
        coins,
        streak,
        last_streak_date,
        is_active,
        kelas:kelas_id (
          id,
          nama,
          tingkat
        )
      `)
      .eq('nis', nis)
      .single();

    if (error || !siswa) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    const streakData = await this.streakService.calculateStreak(nis);

    return {
      success: true,
      data: (() => {
        const kelas = this.normalizeKelas(siswa.kelas as KelasRelation);
        return {
          nis: siswa.nis,
          nama: siswa.nama,
          kelas: kelas ? `${kelas.tingkat} ${kelas.nama}` : '-',
          kelasId: kelas?.id ?? null,
          statusAktif: siswa.is_active,
          coins: siswa.coins,
          streak: streakData.currentStreak,
          lastStreakDate: siswa.last_streak_date,
        };
      })(),
    };
  }

  // ==========================================
  // CREATE SISWA
  // ==========================================
  async create(createSiswaDto: CreateSiswaDto) {
    const supabase = this.supabaseService.getClient();

    // Check if NIS already exists
    const { data: existing } = await supabase
      .from('siswa')
      .select('nis')
      .eq('nis', createSiswaDto.nis)
      .single();

    if (existing) {
      throw new ConflictException(`NIS ${createSiswaDto.nis} sudah terdaftar`);
    }

    // Check if kelas exists
    const { data: kelas } = await supabase
      .from('kelas')
      .select('id, nama, tingkat')
      .eq('id', createSiswaDto.kelasId)
      .single();

    if (!kelas) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createSiswaDto.password, 10);

    // Insert siswa
    const { data: newSiswa, error } = await supabase
      .from('siswa')
      .insert([
        {
          nis: createSiswaDto.nis,
          nama: createSiswaDto.nama,
          password_hash: hashedPassword,
          kelas_id: createSiswaDto.kelasId,
          is_active: createSiswaDto.statusAktif ?? true,
          coins: 0,
          streak: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Gagal menambahkan siswa');
    }

    return {
      success: true,
      message: 'Siswa berhasil ditambahkan',
      data: {
        nis: newSiswa.nis,
        nama: newSiswa.nama,
        kelas: `${kelas.tingkat} ${kelas.nama}`,
      },
    };
  }

  // ==========================================
  // UPDATE SISWA
  // ==========================================
  async update(nis: string, updateSiswaDto: UpdateSiswaDto) {
    const supabase = this.supabaseService.getClient();

    // Check if siswa exists
    const { data: existing } = await supabase
      .from('siswa')
      .select('nis, nama')
      .eq('nis', nis)
      .single();

    if (!existing) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    // Check if kelas exists (if updating kelas)
    if (updateSiswaDto.kelasId) {
      const { data: kelas } = await supabase
        .from('kelas')
        .select('id')
        .eq('id', updateSiswaDto.kelasId)
        .single();

      if (!kelas) {
        throw new NotFoundException('Kelas tidak ditemukan');
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateSiswaDto.nama) updateData.nama = updateSiswaDto.nama;
    if (updateSiswaDto.kelasId) updateData.kelas_id = updateSiswaDto.kelasId;
    if (updateSiswaDto.statusAktif !== undefined) {
      updateData.is_active = updateSiswaDto.statusAktif;
    }

    // Hash password if provided
    if (updateSiswaDto.password) {
      updateData.password_hash = await bcrypt.hash(updateSiswaDto.password, 10);
    }

    // Update siswa
    const { error } = await supabase
      .from('siswa')
      .update(updateData)
      .eq('nis', nis);

    if (error) {
      throw new BadRequestException('Gagal mengupdate siswa');
    }

    return {
      success: true,
      message: `Data siswa ${existing.nama} berhasil diupdate`,
    };
  }

  // ==========================================
  // DELETE SISWA
  // ==========================================
  async remove(nis: string) {
    const supabase = this.supabaseService.getClient();

    // Check if siswa exists
    const { data: existing } = await supabase
      .from('siswa')
      .select('nis, nama')
      .eq('nis', nis)
      .single();

    if (!existing) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    // Delete siswa
    const { error } = await supabase
      .from('siswa')
      .delete()
      .eq('nis', nis);

    if (error) {
      throw new BadRequestException('Gagal menghapus siswa');
    }

    return {
      success: true,
      message: `Siswa ${existing.nama} berhasil dihapus`,
    };
  }

  // ==========================================
  // IMPORT EXCEL
  // ==========================================
  async importExcel(file: UploadedExcelFile) {
    const supabase = this.supabaseService.getClient();
    const errors: any[] = [];
    let successCount = 0;
    let totalRows = 0;
    const rows: Array<{
      row: number;
      nis?: string;
      nama?: string;
      tingkat?: string;
      namaKelas?: string;
      password?: string;
      statusAktif: boolean;
      kelasIdRaw?: string;
    }> = [];

    const isCsvByMime = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel',
    ].includes(file.mimetype);
    const isCsvByName = (file.originalname ?? '')
      .toLowerCase()
      .endsWith('.csv');

    if (isCsvByMime || isCsvByName) {
      const content = file.buffer.toString('utf8');
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Skip CSV header row (line 1)
      for (let i = 1; i < lines.length; i++) {
        const cols = this.parseCsvLine(lines[i]);
        rows.push({
          row: i + 1,
          nis: cols[0]?.toString().trim(),
          nama: cols[1]?.toString().trim(),
          tingkat: cols[2]?.toString().trim(),
          namaKelas: cols[3]?.toString().trim(),
          password: cols[4]?.toString().trim(),
          statusAktif:
            (cols[5] ?? '').toString().trim() === ''
              ? true
              : (cols[5] ?? '').toString().trim().toLowerCase() === 'true',
          kelasIdRaw: cols[6]?.toString().trim(),
        });
      }
    } else {
      // Load workbook for xlsx/xlsm/xlsb
      let ExcelJS: any;
      try {
        ExcelJS = require('exceljs');
      } catch {
        throw new BadRequestException(
          'Fitur import Excel membutuhkan package exceljs. Jalankan npm i exceljs, atau gunakan file CSV.',
        );
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Worksheet tidak ditemukan di file');
      }

      // Process each row (skip header)
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        rows.push({
          row: i,
          nis: row.getCell(1).value?.toString().trim(),
          nama: row.getCell(2).value?.toString().trim(),
          tingkat: row.getCell(3).value?.toString().trim(),
          namaKelas: row.getCell(4).value?.toString().trim(),
          password: row.getCell(5).value?.toString().trim(),
          statusAktif:
            row.getCell(6).value?.toString().trim() === ''
              ? true
              : row.getCell(6).value?.toString().trim().toLowerCase() === 'true',
          kelasIdRaw: row.getCell(7).value?.toString().trim(),
        });
      }
    }

    // Get all kelas for mapping
    const { data: kelasList } = await supabase
      .from('kelas')
      .select('id, nama, tingkat');

    const kelasMap = new Map(
      kelasList?.map(k => [`${k.tingkat}-${k.nama}`, k.id]) || []
    );
    const kelasIdMap = new Map(
      kelasList?.map((k) => [Number(k.id), Number(k.id)]) || [],
    );

    // Process parsed rows
    for (const rowData of rows) {
      const nis = rowData.nis;
      const nama = rowData.nama;
      const tingkatRaw = rowData.tingkat;
      const namaKelas = rowData.namaKelas;
      const password = rowData.password;
      const statusAktif = rowData.statusAktif;
      const kelasIdRaw = rowData.kelasIdRaw;

      // Ignore note/comment rows and duplicated header rows in CSV template.
      if (
        (nis && nis.startsWith('#')) ||
        (nis && nis.toUpperCase() === 'NIS') ||
        (nis && nis.toUpperCase() === 'NOMOR INDUK SISWA')
      ) {
        continue;
      }

      // Skip informational rows (e.g., notes in template) and effectively empty rows.
      if (!nama && !password && !tingkatRaw && !namaKelas && !kelasIdRaw) {
        continue;
      }

      totalRows++;

      // Validation
      if (
        !nis ||
        !nama ||
        !password ||
        (!kelasIdRaw && (!tingkatRaw || !namaKelas))
      ) {
        errors.push({
          row: rowData.row,
          nis: nis || '-',
          error:
            'Data tidak lengkap (wajib: NIS, Nama, Password, dan Kelas ID atau Tingkat+Nama Kelas)',
        });
        continue;
      }

      // Resolve kelas ID: prefer explicit kelas_id column if provided.
      let kelasId: number | undefined;
      let kelasKey = '-';

      if (kelasIdRaw) {
        const parsedKelasId = Number(kelasIdRaw);
        if (!Number.isFinite(parsedKelasId)) {
          errors.push({
            row: rowData.row,
            nis,
            error: `Kelas ID ${kelasIdRaw} tidak valid`,
          });
          continue;
        }
        kelasId = kelasIdMap.get(parsedKelasId);
      } else {
        const tingkat = this.normalizeTingkat(tingkatRaw!);
        kelasKey = `${tingkat}-${namaKelas}`;
        kelasId = kelasMap.get(kelasKey);
      }

      if (!kelasId) {
        errors.push({
          row: rowData.row,
          nis,
          error: kelasIdRaw
            ? `Kelas ID ${kelasIdRaw} tidak ditemukan`
            : `Kelas ${kelasKey} tidak ditemukan`,
        });
        continue;
      }

      // Check if NIS already exists
      const { data: existing } = await supabase
        .from('siswa')
        .select('nis')
        .eq('nis', nis)
        .single();

      if (existing) {
        errors.push({
          row: rowData.row,
          nis,
          error: 'NIS sudah terdaftar',
        });
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert siswa
      const { error } = await supabase
        .from('siswa')
        .insert([
          {
            nis,
            nama,
            password_hash: hashedPassword,
            kelas_id: kelasId,
            is_active: statusAktif,
            coins: 0,
            streak: 0,
          },
        ]);

      if (error) {
        errors.push({
          row: rowData.row,
          nis,
          error: error.message,
        });
      } else {
        successCount++;
      }
    }

    return {
      success: true,
      message: 'Import selesai',
      data: {
        total: totalRows,
        success: successCount,
        failed: errors.length,
        errors,
      },
    };
  }
}

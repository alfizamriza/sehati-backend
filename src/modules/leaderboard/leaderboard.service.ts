import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

type Jenjang = 'SD' | 'SMP' | 'SMA';

export interface LeaderboardSiswaRow {
  rank: number;
  nis: string;
  nama: string;
  kelas: string;
  jenjang: string;
  coins: number;
  streak: number;
  is_me: boolean;
  fotoUrl: string | null;
}

export interface LeaderboardKelasRow {
  rank: number;
  kelas_id: number | string;
  nama_kelas: string;
  tingkat: string;
  jenjang: string;
  total_coins: number;
  avg_coins: number;
  jumlah_siswa: number;
  is_my_class: boolean;
}

export interface LeaderboardJenjangRow {
  rank: number;
  jenjang: string;
  avg_coins: number;
  total_siswa: number;
  total_coins: number;
}

type KelasRow = {
  id: number | string;
  nama: string | null;
  tingkat: number | string | null;
  jenjang?: string | null;
  jejang?: string | null;
};

type SiswaRow = {
  nis: string;
  nama: string | null;
  kelas_id: number | string | null;
  coins: number | null;
  streak: number | null;
  last_streak_date: string | null;
  is_active?: boolean | null;
  foto_url: string | null;
};

@Injectable()
export class LeaderboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private jenjangColumn: 'jenjang' | 'jejang' | null = 'jenjang';
  private jenjangColumnResolved = false;

  private normalizeJenjang(value?: string | null): Jenjang | null {
    const raw = String(value ?? '')
      .trim()
      .toUpperCase();
    if (raw === 'SD' || raw === 'SMP' || raw === 'SMA') return raw;
    return null;
  }

  private normalizeJenjangParam(value: string): Jenjang {
    const normalized = this.normalizeJenjang(value);
    if (!normalized) {
      throw new BadRequestException(
        'Jenjang harus salah satu dari: SD, SMP, SMA',
      );
    }
    return normalized;
  }

  private deriveJenjangFromTingkat(tingkat: unknown): Jenjang | null {
    const t = Number(tingkat);
    if (!Number.isFinite(t)) return null;
    if (t >= 1 && t <= 6) return 'SD';
    if (t >= 7 && t <= 9) return 'SMP';
    if (t >= 10 && t <= 12) return 'SMA';
    return null;
  }

  private deriveJenjang(kelas?: KelasRow | null): Jenjang | null {
    if (!kelas) return null;
    const byColumn = this.normalizeJenjang(kelas.jenjang ?? kelas.jejang);
    if (byColumn) return byColumn;
    return this.deriveJenjangFromTingkat(kelas.tingkat);
  }

  private formatKelasLabel(kelas?: KelasRow | null): string {
    if (!kelas) return '-';
    const tingkat = this.formatTingkatRoman(kelas.tingkat);
    const nama = kelas.nama ?? '-';
    return `${tingkat}-${nama}`;
  }

  private formatTingkatRoman(value: unknown): string {
    if (value == null) return '-';

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

    const parsed = Number(value);
    if (Number.isFinite(parsed) && romanMap[parsed]) {
      return romanMap[parsed];
    }

    if (typeof value === 'string') {
      return value.trim().toUpperCase() || '-';
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).toUpperCase();
    }
    return '-';
  }

  private getTodayWIB(): string {
    const now = new Date();
    const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wibDate.toISOString().split('T')[0];
  }

  private parseDateOnly(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async getHolidaySet(from: Date, to: Date): Promise<Set<string>> {
    const client = this.supabaseService.getClient();
    const fromStr = this.formatDateOnly(from);
    const toStr = this.formatDateOnly(to);

    const { data, error } = await client
      .from('tanggal_libur')
      .select('tanggal')
      .eq('is_active', true)
      .gte('tanggal', fromStr)
      .lte('tanggal', toStr);

    if (error) {
      throw new BadRequestException(
        `Gagal mengambil tanggal libur: ${error.message}`,
      );
    }

    return new Set((data ?? []).map((row: { tanggal: string }) => row.tanggal));
  }

  private countWorkdaysBetween(
    startDate: Date,
    endDate: Date,
    holidaySet: Set<string>,
  ): number {
    let count = 0;
    const current = new Date(startDate);

    while (current < endDate) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      const dateStr = this.formatDateOnly(current);
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidaySet.has(dateStr);

      if (!isWeekend && !isHoliday) {
        count++;
      }
    }

    return count;
  }

  private async withEffectiveStreak(siswaRows: SiswaRow[]): Promise<SiswaRow[]> {
    const today = this.parseDateOnly(this.getTodayWIB());
    const lastDates = siswaRows
      .map((row) => row.last_streak_date)
      .filter((value): value is string => Boolean(value));

    if (!lastDates.length) {
      return siswaRows.map((row) => ({ ...row, streak: 0 }));
    }

    const earliestLastDate = lastDates.reduce((min, current) =>
      current < min ? current : min,
    );

    const holidaySet = await this.getHolidaySet(
      this.parseDateOnly(earliestLastDate),
      today,
    );

    return siswaRows.map((row) => {
      if (!row.last_streak_date || !row.streak) {
        return { ...row, streak: 0 };
      }

      const lastStreakDate = this.parseDateOnly(row.last_streak_date);
      const workdaysSinceLastStreak = this.countWorkdaysBetween(
        lastStreakDate,
        today,
        holidaySet,
      );

      if (workdaysSinceLastStreak > 1) {
        return { ...row, streak: 0 };
      }

      return row;
    });
  }

  private async resolveJenjangColumn(): Promise<'jenjang' | 'jejang' | null> {
    if (this.jenjangColumnResolved) return this.jenjangColumn;

    const client = this.supabaseService.getClient();
    const jenjangProbe = await client.from('kelas').select('jenjang').limit(1);
    if (!jenjangProbe.error) {
      this.jenjangColumn = 'jenjang';
      this.jenjangColumnResolved = true;
      return this.jenjangColumn;
    }

    const jejangProbe = await client.from('kelas').select('jejang').limit(1);
    if (!jejangProbe.error) {
      this.jenjangColumn = 'jejang';
      this.jenjangColumnResolved = true;
      return this.jenjangColumn;
    }

    this.jenjangColumn = null;
    this.jenjangColumnResolved = true;
    return this.jenjangColumn;
  }

  private async getKelasMap(): Promise<Map<string, KelasRow>> {
    const client = this.supabaseService.getClient();
    const jenjangColumn = await this.resolveJenjangColumn();
    const selectClause = jenjangColumn
      ? `id, nama, tingkat, ${jenjangColumn}`
      : 'id, nama, tingkat';

    const { data, error } = await client.from('kelas').select(selectClause);
    if (error) {
      throw new BadRequestException(
        `Gagal mengambil data kelas: ${error.message}`,
      );
    }

    const map = new Map<string, KelasRow>();
    const kelasRows = (data ?? []) as unknown as KelasRow[];
    kelasRows.forEach((k) => {
      map.set(String(k.id), k);
    });
    return map;
  }

  private async getSiswaActive(
    filterKelasId?: number | string,
  ): Promise<SiswaRow[]> {
    const client = this.supabaseService.getClient();
    let query = client
      .from('siswa')
      .select('nis, nama, kelas_id, coins, streak, last_streak_date, is_active, foto_url')
      .eq('is_active', true);

    if (filterKelasId !== undefined) {
      query = query.eq('kelas_id', filterKelasId);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(
        `Gagal mengambil data siswa: ${error.message}`,
      );
    }

    return this.withEffectiveStreak((data ?? []) as SiswaRow[]);
  }

  private rank<T>(
    rows: T[],
    getScore: (row: T) => number,
    getName: (row: T) => string,
  ): T[] {
    return [...rows].sort((a, b) => {
      const scoreDiff = getScore(b) - getScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return getName(a).localeCompare(getName(b), 'id');
    });
  }

  private buildSiswaLeaderboard(
    siswaRows: SiswaRow[],
    kelasMap: Map<string, KelasRow>,
    nisLogin?: string,
  ): LeaderboardSiswaRow[] {
    const sorted = this.rank(
      siswaRows,
      (r) => Number(r.coins ?? 0),
      (r) => String(r.nama ?? ''),
    );

    return sorted.map((r, idx) => {
      const kelas =
        r.kelas_id != null ? kelasMap.get(String(r.kelas_id)) : undefined;
      const jenjang = this.deriveJenjang(kelas) ?? '-';

      return {
        rank: idx + 1,
        nis: r.nis,
        nama: String(r.nama ?? '-'),
        kelas: this.formatKelasLabel(kelas),
        jenjang,
        coins: Number(r.coins ?? 0),
        streak: Number(r.streak ?? 0),
        is_me: Boolean(nisLogin && r.nis === nisLogin),
        fotoUrl: r.foto_url ?? null,
      };
    });
  }

  async getKelasSaya(nisLogin: string): Promise<LeaderboardSiswaRow[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('siswa')
      .select('nis, kelas_id')
      .eq('nis', nisLogin)
      .maybeSingle();
    const loginSiswa = data as {
      nis: string;
      kelas_id: number | string | null;
    } | null;

    if (error) {
      throw new BadRequestException(
        `Gagal mengambil data siswa login: ${error.message}`,
      );
    }
    if (!loginSiswa?.kelas_id) return [];

    const [kelasMap, siswaRows] = await Promise.all([
      this.getKelasMap(),
      this.getSiswaActive(loginSiswa.kelas_id),
    ]);

    return this.buildSiswaLeaderboard(siswaRows, kelasMap, nisLogin);
  }

  async getKelasByIdAdmin(
    kelasId: number | null,
  ): Promise<LeaderboardSiswaRow[]> {
    const [kelasMap, siswaRows] = await Promise.all([
      this.getKelasMap(),
      kelasId === null ? this.getSiswaActive() : this.getSiswaActive(kelasId),
    ]);

    return this.buildSiswaLeaderboard(siswaRows, kelasMap);
  }

  async getAntarKelas(
    nisLogin?: string,
    jenjang?: string,
  ): Promise<LeaderboardKelasRow[]> {
    const jenjangFilter = jenjang ? this.normalizeJenjangParam(jenjang) : null;
    const [kelasMap, siswaRows] = await Promise.all([
      this.getKelasMap(),
      this.getSiswaActive(),
    ]);

    let myKelasId: number | string | null = null;
    if (nisLogin) {
      const loginSiswa = siswaRows.find((s) => s.nis === nisLogin);
      myKelasId = loginSiswa?.kelas_id ?? null;
    }

    const grouped = new Map<
      string,
      {
        kelas_id: number | string;
        nama_kelas: string;
        tingkat: string;
        jenjang: string;
        total_coins: number;
        jumlah_siswa: number;
      }
    >();

    for (const s of siswaRows) {
      if (s.kelas_id == null) continue;
      const kelas = kelasMap.get(String(s.kelas_id));
      const j = this.deriveJenjang(kelas);
      if (!j) continue;
      if (jenjangFilter && j !== jenjangFilter) continue;

      const key = String(s.kelas_id);
      const current = grouped.get(key);
      if (current) {
        current.total_coins += Number(s.coins ?? 0);
        current.jumlah_siswa += 1;
      } else {
        grouped.set(key, {
          kelas_id: s.kelas_id,
          nama_kelas: String(kelas?.nama ?? '-'),
          tingkat: this.formatTingkatRoman(kelas?.tingkat),
          jenjang: j,
          total_coins: Number(s.coins ?? 0),
          jumlah_siswa: 1,
        });
      }
    }

    const baseRows = Array.from(grouped.values()).map((g) => ({
      ...g,
      avg_coins: g.jumlah_siswa > 0 ? g.total_coins / g.jumlah_siswa : 0,
      is_my_class:
        myKelasId != null && String(g.kelas_id) === String(myKelasId),
    }));

    const sorted = this.rank(
      baseRows,
      (r) => r.avg_coins,
      (r) => r.nama_kelas,
    );

    return sorted.map((row, idx) => ({
      rank: idx + 1,
      kelas_id: row.kelas_id,
      nama_kelas: row.nama_kelas,
      tingkat: row.tingkat,
      jenjang: row.jenjang,
      total_coins: row.total_coins,
      avg_coins: row.avg_coins,
      jumlah_siswa: row.jumlah_siswa,
      is_my_class: row.is_my_class,
    }));
  }

  async getSekolah(nisLogin?: string): Promise<LeaderboardSiswaRow[]> {
    const [kelasMap, siswaRows] = await Promise.all([
      this.getKelasMap(),
      this.getSiswaActive(),
    ]);
    return this.buildSiswaLeaderboard(siswaRows, kelasMap, nisLogin);
  }

  async getAntarJenjang(): Promise<LeaderboardJenjangRow[]> {
    const [kelasMap, siswaRows] = await Promise.all([
      this.getKelasMap(),
      this.getSiswaActive(),
    ]);

    const grouped = new Map<
      Jenjang,
      { total_coins: number; total_siswa: number }
    >();

    for (const s of siswaRows) {
      const kelas =
        s.kelas_id != null ? kelasMap.get(String(s.kelas_id)) : undefined;
      const j = this.deriveJenjang(kelas);
      if (!j) continue;

      const current = grouped.get(j) ?? { total_coins: 0, total_siswa: 0 };
      current.total_coins += Number(s.coins ?? 0);
      current.total_siswa += 1;
      grouped.set(j, current);
    }

    const baseRows = Array.from(grouped.entries()).map(([j, value]) => ({
      jenjang: j,
      total_coins: value.total_coins,
      total_siswa: value.total_siswa,
      avg_coins:
        value.total_siswa > 0 ? value.total_coins / value.total_siswa : 0,
    }));

    const sorted = this.rank(
      baseRows,
      (r) => r.avg_coins,
      (r) => r.jenjang,
    );

    return sorted.map((r, idx) => ({
      rank: idx + 1,
      jenjang: r.jenjang,
      avg_coins: r.avg_coins,
      total_siswa: r.total_siswa,
      total_coins: r.total_coins,
    }));
  }

  async getSiswaAntarJenjang(nisLogin: string): Promise<LeaderboardSiswaRow[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('siswa')
      .select('nis, kelas_id')
      .eq('nis', nisLogin)
      .maybeSingle();
    const loginSiswa = data as {
      nis: string;
      kelas_id: number | string | null;
    } | null;

    if (error) {
      throw new BadRequestException(
        `Gagal mengambil data siswa login: ${error.message}`,
      );
    }
    if (!loginSiswa?.kelas_id) return [];

    const kelasMap = await this.getKelasMap();
    const loginKelas = kelasMap.get(String(loginSiswa.kelas_id));
    const loginJenjang = this.deriveJenjang(loginKelas);
    if (!loginJenjang) return [];

    return this.getSiswaByJenjangInternal(loginJenjang, nisLogin);
  }

  async getSiswaByJenjang(jenjang: string): Promise<LeaderboardSiswaRow[]> {
    const normalized = this.normalizeJenjangParam(jenjang);
    return this.getSiswaByJenjangInternal(normalized);
  }

  private async getSiswaByJenjangInternal(
    jenjang: Jenjang,
    nisLogin?: string,
  ): Promise<LeaderboardSiswaRow[]> {
    const [kelasMap, siswaRows] = await Promise.all([
      this.getKelasMap(),
      this.getSiswaActive(),
    ]);
    const filtered = siswaRows.filter((s) => {
      const kelas =
        s.kelas_id != null ? kelasMap.get(String(s.kelas_id)) : undefined;
      return this.deriveJenjang(kelas) === jenjang;
    });

    return this.buildSiswaLeaderboard(filtered, kelasMap, nisLogin);
  }
  // =====================================================
  // SCHOOL SETTINGS (from `pengaturan` table)
  // =====================================================
  async getSchoolSettings(): Promise<Record<string, string>> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('pengaturan')
      .select('key, value');

    if (error) {
      throw new BadRequestException(
        `Gagal mengambil pengaturan sekolah: ${error.message}`,
      );
    }

    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  // =====================================================
  // PDF GENERATION
  // =====================================================
  async generateLeaderboardPdf(
    rows: any[],
    title: string,
  ): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const settings = await this.getSchoolSettings();

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });

    // -- Background & Header --
    doc.rect(0, 0, doc.page.width, 100).fill('#1A365D');
    doc.fillColor('#FFFFFF');

    const schoolName = settings['nama_sekolah'] || 'Sekolah';
    doc.fontSize(20).font('Helvetica-Bold').text(schoolName, 0, 25, { align: 'center' });
    
    doc.fontSize(10).font('Helvetica');
    if (settings['alamat']) {
      doc.text(settings['alamat'], { align: 'center' });
    }
    if (settings['email_sekolah']) {
      doc.text(`Email: ${settings['email_sekolah']}`, { align: 'center' });
    }
    
    doc.moveDown(2);
    doc.fillColor('#2D3748');

    // -- Layout --
    doc.fontSize(16).font('Helvetica-Bold').text(title, 40, 120, { align: 'center' });
    
    const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(10).font('Helvetica').fillColor('#718096').text(`Tanggal: ${dateStr}`, { align: 'center' });
    doc.moveDown(1.5);
    
    doc.fillColor('#1A202C');

    if (!rows || rows.length === 0) {
      doc.fontSize(12).text('Tidak ada data.', { align: 'center' });
      doc.end();
      return pdfPromise;
    }

    // Identifikasi Data Tab
    let headers: string[] = [];
    let colWidths: number[] = [];
    let startX = 40;
    
    const isAntarJenjang = rows[0].jenjang !== undefined && rows[0].nama === undefined && rows[0].nama_kelas === undefined;
    const isAntarKelas = rows[0].nama_kelas !== undefined;

    if (isAntarJenjang) {
      headers = ['Rank', 'Jenjang', 'Rata-rata Koin', 'Total Siswa', 'Total Koin'];
      colWidths = [50, 100, 120, 100, 145];
    } else if (isAntarKelas) {
      headers = ['Rank', 'Kelas', 'Jenjang', 'Rata-rata Koin', 'Total Siswa'];
      colWidths = [50, 180, 100, 100, 85];
    } else {
      headers = ['Rank', 'Nama Siswa', 'Kelas', 'Jenjang', 'Koin', 'Streak'];
      colWidths = [45, 180, 80, 70, 70, 70];
    }

    // -- Draw Table Header --
    doc.font('Helvetica-Bold').fontSize(10);
    doc.rect(40, doc.y, 515, 25).fill('#EDF2F7');
    doc.fillColor('#2D3748');
    
    let currentX = startX;
    headers.forEach((h, i) => {
      doc.text(h, currentX + 5, doc.y + 7, { width: colWidths[i] - 10, align: i === 0 ? 'center' : (i > 3 ? 'center' : 'left') });
      currentX += colWidths[i];
    });
    
    doc.y += 18;
    doc.moveDown(0.5);

    // -- Draw Table Rows --
    doc.font('Helvetica').fontSize(10);
    
    rows.forEach((r, idx) => {
      // Check if page break is needed
      if (doc.y > 750) {
        doc.addPage();
        doc.font('Helvetica-Bold');
        doc.rect(40, doc.y, 515, 25).fill('#EDF2F7');
        doc.fillColor('#2D3748');
        currentX = startX;
        headers.forEach((h, i) => {
          doc.text(h, currentX + 5, doc.y + 7, { width: colWidths[i] - 10, align: i === 0 ? 'center' : (i > 3 ? 'center' : 'left') });
          currentX += colWidths[i];
        });
        doc.y += 18;
        doc.font('Helvetica');
        doc.moveDown(0.5);
      }

      currentX = startX;
      
      const isTop3 = r.rank <= 3;
      if (isTop3) {
        doc.rect(40, doc.y - 3, 515, 20).fill('#FFFFF0');
        doc.fillColor('#B7791F');
        doc.font('Helvetica-Bold');
      } else {
        if (idx % 2 === 0) {
          doc.rect(40, doc.y - 3, 515, 20).fill('#F7FAFC');
        }
        doc.fillColor('#4A5568');
        doc.font('Helvetica');
      }

      const yPos = doc.y + 2;
      
      doc.text(String(r.rank), currentX, yPos, { width: colWidths[0], align: 'center' });
      currentX += colWidths[0];

      if (isAntarJenjang) {
        doc.text(r.jenjang || '-', currentX + 5, yPos, { width: colWidths[1] - 10, align: 'left' });
        currentX += colWidths[1];
        doc.text(String(Math.round(r.avg_coins || 0)), currentX + 5, yPos, { width: colWidths[2] - 10, align: 'center' });
        currentX += colWidths[2];
        doc.text(String(r.total_siswa || 0), currentX + 5, yPos, { width: colWidths[3] - 10, align: 'center' });
        currentX += colWidths[3];
        doc.text(String(r.total_coins || 0), currentX + 5, yPos, { width: colWidths[4] - 10, align: 'center' });
      } else if (isAntarKelas) {
        doc.text(r.nama_kelas || '-', currentX + 5, yPos, { width: colWidths[1] - 10, align: 'left' });
        currentX += colWidths[1];
        doc.text(r.jenjang || '-', currentX + 5, yPos, { width: colWidths[2] - 10, align: 'left' });
        currentX += colWidths[2];
        doc.text(String(Math.round(r.avg_coins || 0)), currentX + 5, yPos, { width: colWidths[3] - 10, align: 'center' });
        currentX += colWidths[3];
        doc.text(String(r.jumlah_siswa || 0), currentX + 5, yPos, { width: colWidths[4] - 10, align: 'center' });
      } else {
        doc.text(r.nama || '-', currentX + 5, yPos, { width: colWidths[1] - 10, align: 'left' });
        currentX += colWidths[1];
        doc.text(r.kelas || '-', currentX + 5, yPos, { width: colWidths[2] - 10, align: 'left' });
        currentX += colWidths[2];
        doc.text(r.jenjang || '-', currentX + 5, yPos, { width: colWidths[3] - 10, align: 'left' });
        currentX += colWidths[3];
        doc.text(String(r.coins || 0), currentX + 5, yPos, { width: colWidths[4] - 10, align: 'center' });
        currentX += colWidths[4];
        doc.text(String(r.streak || 0) + ' hari', currentX + 5, yPos, { width: colWidths[5] - 10, align: 'center' });
      }

      doc.y += 15;
    });
    
    // -- Footer Summary --
    doc.moveDown(2);
    doc.fillColor('#A0AEC0').fontSize(8).text('Terima kasih atas dedikasi dan konsistensi Anda dalam program SEHATI.', { align: 'center' });

    doc.end();

    return pdfPromise;
  }
}

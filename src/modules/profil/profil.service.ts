import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { StreakService } from 'src/modules/streak/streak.service';
import { LeaderboardService } from 'src/modules/leaderboard/leaderboard.service';
import * as bcrypt from 'bcrypt';
import { convertToRomanNumeral } from 'src/common/helpers/number.helper';

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface ProfilSiswa {
  nis: string;
  nama: string;
  kelas: string;         // e.g. "XII RPL 1"
  tingkat: number;
  namaKelas: string;
  coins: number;
  streak: number;
  lastStreakDate: string | null;
  joinDate: string;
  fotoUrl: string | null;
  rankingKelas: number;
  rankingSekolah: number;
  totalTumbler: number;
  totalPelanggaran: number;
}

export interface ProfilAchievement {
  id: number;
  nama: string;
  deskripsi: string | null;
  tipe: string;
  icon: string;
  badgeColor: string;
  unlockedAt: string;
}

export interface ProfilVoucher {
  id: string;
  kodeVoucher: string;
  namaVoucher: string;
  tanggalBerlaku: string;
  tanggalBerakhir: string;
  nominalVoucher: number;
  tipeVoucher: 'fixed' | 'percentage';
  status: string;
  usedAt: string | null;
}

export interface ProfilShowcaseNote {
  id: string;
  achievementId: number;
  achievementName: string;
  achievementIcon: string;
  achievementBadgeColor: string;
  noteText: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface ProfilResponse {
  profil: ProfilSiswa;
  achievements: ProfilAchievement[];
  vouchers: ProfilVoucher[];
  showcaseNote: ProfilShowcaseNote | null;
}

export interface UpdateFotoDto {
  fotoUrl: string;    // URL dari storage Supabase setelah upload
}

export interface UpdatePasswordDto {
  passwordLama: string;
  passwordBaru: string;
}

@Injectable()
export class ProfilService {
  constructor(
    private supabaseService: SupabaseService,
    private streakService: StreakService,
    private leaderboardService: LeaderboardService,
  ) { }

  // ============================================
  // Helper: format tanggal ke DD MMMM YYYY (id-ID)
  // ============================================
  private formatDateIndo(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
  }

  // ============================================
  // Helper: get today string in WIB to avoid timezone shift
  // ============================================
  private getTodayWIB(): string {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utcMs + 7 * 60 * 60 * 1000);
    const y = wib.getUTCFullYear();
    const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
    const d = String(wib.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // =====================================================
  // GET PROFIL LENGKAP
  // =====================================================
  async getProfil(nis: string): Promise<ProfilResponse> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    // Jalankan SEMUA query berat secara PARALEL untuk mencegah API Timeout!
    const [
      leaderboardSekolah,
      leaderboardKelas,
      siswaRes,
      tumblerRes,
      pelanggaranRes,
      uaRes,
      voucherRes,
      showcaseRes,
    ] = await Promise.all([
      this.leaderboardService.getSekolah(nisStr),
      this.leaderboardService.getKelasSaya(nisStr),
      supabase
        .from('siswa')
        .select('nis, nama, kelas_id, coins, streak, last_streak_date, created_at, foto_url, kelas:kelas_id(nama, tingkat)')
        .eq('nis', nisStr)
        .maybeSingle(),
      supabase.from('absensi_tumbler').select('id', { count: 'exact', head: true }).eq('nis', nisStr),
      supabase.from('pelanggaran').select('id', { count: 'exact', head: true }).eq('nis', nisStr).eq('status', 'approved'),
      supabase
        .from('user_achievement')
        .select('unlocked_at, achievement:achievement_id (id, nama, deskripsi, tipe, icon, badge_color)')
        .eq('nis', nisStr)
        .order('unlocked_at', { ascending: false }),
      supabase
        .from('voucher')
        .select('id, kode_voucher, nama_voucher, tanggal_berlaku, tanggal_berakhir, nominal_voucher, tipe_voucher, status, used_at')
        .eq('nis', nisStr)
        .order('created_at', { ascending: false }),
      supabase
        .from('achievement_showcase_note')
        .select(`id, achievement_id, note_text, expires_at, created_at, achievement:achievement_id (id, nama, icon, badge_color)`)
        .eq('nis', nisStr)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle(),
    ]);

    const { data: siswa, error: errSiswa } = siswaRes;

    if (errSiswa || !siswa) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    const meSekolah = leaderboardSekolah.find(s => s.nis === nisStr);
    const meKelas = leaderboardKelas.find(s => s.nis === nisStr);

    const rankingSekolah = meSekolah ? meSekolah.rank : 0;
    const rankingKelas = meKelas ? meKelas.rank : 0;
    const effectiveStreak = meSekolah ? meSekolah.streak : 0;

    let kelasLabel = '-';
    let tingkat = 0;
    let namaKelas = '-';

    if (siswa.kelas) {
      const k = Array.isArray(siswa.kelas) ? siswa.kelas[0] : siswa.kelas;
      if (k) {
        tingkat = (k as any).tingkat;
        namaKelas = (k as any).nama;
        kelasLabel = `${convertToRomanNumeral(tingkat)} ${namaKelas}`;
      }
    }

    const achievements: ProfilAchievement[] = (uaRes.data || []).map((ua: any) => {
      const ach = Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement;
      return {
        id: ach?.id ?? 0,
        nama: ach?.nama ?? '-',
        deskripsi: ach?.deskripsi ?? null,
        tipe: ach?.tipe ?? '-',
        icon: ach?.icon ?? '🏆',
        badgeColor: ach?.badge_color ?? 'blue',
        unlockedAt: ua.unlocked_at ?? '-',
      };
    });

    const today = this.getTodayWIB();
    const expireIds: string[] = [];

    const vouchers: ProfilVoucher[] = (voucherRes.data || []).map((v: any) => {
      const status = (v.status ?? 'available') as string;
      const isExpired = status === 'available' && v.tanggal_berakhir && v.tanggal_berakhir < today;
      if (isExpired && v.id) expireIds.push(v.id);

      return {
        id: String(v.id ?? ''),
        kodeVoucher: v.kode_voucher ?? '-',
        namaVoucher: v.nama_voucher ?? '-',
        tanggalBerlaku: this.formatDateIndo(v.tanggal_berlaku ?? null),
        tanggalBerakhir: this.formatDateIndo(v.tanggal_berakhir ?? null),
        nominalVoucher: Number(v.nominal_voucher ?? 0),
        tipeVoucher: v.tipe_voucher === 'percentage' ? 'percentage' : 'fixed',
        status: isExpired ? 'expired' : status,
        usedAt: v.used_at ?? null,
      };
    });

    const showcaseRow = showcaseRes.data;
    const showcaseAchievement = Array.isArray(showcaseRow?.achievement)
      ? showcaseRow.achievement[0]
      : showcaseRow?.achievement;
    
    const showcaseNote: ProfilShowcaseNote | null = showcaseRow
      ? {
          id: String(showcaseRow.id ?? ''),
          achievementId: Number(
            showcaseRow.achievement_id ?? showcaseAchievement?.id ?? 0,
          ),
          achievementName: showcaseAchievement?.nama ?? '-',
          achievementIcon: showcaseAchievement?.icon ?? '🏆',
          achievementBadgeColor: showcaseAchievement?.badge_color ?? 'blue',
          noteText:
            typeof showcaseRow.note_text === 'string' &&
            showcaseRow.note_text.trim().length > 0
              ? showcaseRow.note_text.trim()
              : null,
          expiresAt: showcaseRow.expires_at ?? null,
          createdAt: showcaseRow.created_at ?? null,
        }
      : null;

    // Update status kadaluarsa di database (non-blocking)
    if (expireIds.length > 0) {
      supabase
        .from('voucher')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .in('id', expireIds)
        .then(({ error }) => {
          if (error) console.error('[Profil] Gagal auto-expire voucher:', error);
        });
    }

    return {
      profil: {
        nis: siswa.nis,
        nama: siswa.nama,
        kelas: kelasLabel,
        tingkat,
        namaKelas,
        coins: siswa.coins ?? 0,
        streak: effectiveStreak,
        lastStreakDate: siswa.last_streak_date ?? null,
        joinDate: siswa.created_at ?? '-',
        fotoUrl: siswa.foto_url ?? null,
        rankingKelas,
        rankingSekolah,
        totalTumbler: tumblerRes.count ?? 0,
        totalPelanggaran: pelanggaranRes.count ?? 0,
      },
      achievements,
      vouchers,
      showcaseNote,
    };
  }

  // =====================================================
  // UPDATE FOTO PROFIL
  // =====================================================
  async updateFoto(nis: string, dto: UpdateFotoDto): Promise<{ fotoUrl: string }> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    const { error } = await supabase
      .from('siswa')
      .update({ foto_url: dto.fotoUrl, updated_at: new Date().toISOString() })
      .eq('nis', nisStr);

    if (error) throw new BadRequestException(`Gagal update foto: ${error.message}`);
    return { fotoUrl: dto.fotoUrl };
  }

  // =====================================================
  // GANTI PASSWORD
  // =====================================================
  async updatePassword(nis: string, dto: UpdatePasswordDto): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    if (!dto.passwordBaru || dto.passwordBaru.length < 6) {
      throw new BadRequestException('Password baru minimal 6 karakter');
    }

    // Ambil hash lama
    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('password_hash')
      .eq('nis', nisStr)
      .maybeSingle();

    if (error || !siswa) throw new NotFoundException('Siswa tidak ditemukan');

    // Verifikasi password lama
    const valid = await bcrypt.compare(dto.passwordLama, siswa.password_hash);
    if (!valid) throw new BadRequestException('Password lama tidak sesuai');

    // Hash password baru
    const newHash = await bcrypt.hash(dto.passwordBaru, 10);

    const { error: errUpdate } = await supabase
      .from('siswa')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('nis', nisStr);

    if (errUpdate) throw new BadRequestException(`Gagal update password: ${errUpdate.message}`);
  }

  // =====================================================
  // UPLOAD FOTO — generate signed URL untuk upload langsung
  // dari frontend ke Supabase Storage bucket 'profil-siswa'
  // =====================================================
  async getUploadUrl(nis: string, mimeType: string): Promise<{ uploadUrl: string; publicUrl: string; path: string }> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();

    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `${nisStr}/avatar-${Date.now()}.${ext}`;

    // Signed URL untuk upload (valid 60 detik)
    const { data, error } = await supabase.storage
      .from('profil-siswa')
      .createSignedUploadUrl(path);

    if (error) throw new BadRequestException(`Gagal generate upload URL: ${error.message}`);

    const publicUrl = supabase.storage.from('profil-siswa').getPublicUrl(path).data.publicUrl;

    return { uploadUrl: data.signedUrl, publicUrl, path };
  }
}

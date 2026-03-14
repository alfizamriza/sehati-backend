import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { StreakService } from 'src/modules/streak/streak.service';
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

export interface ProfilResponse {
  profil: ProfilSiswa;
  achievements: ProfilAchievement[];
  vouchers: ProfilVoucher[];
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
  ) { }

  // =====================================================
  // GET PROFIL LENGKAP
  // =====================================================
  async getProfil(nis: string): Promise<ProfilResponse> {
    const supabase = this.supabaseService.getClient();
    const nisStr = String(nis).trim();
    const streakData = await this.streakService.calculateStreak(nisStr);

    // 1. Data siswa + kelas
    const { data: siswa, error: errSiswa } = await supabase
      .from('siswa')
      .select('nis, nama, kelas_id, coins, streak, last_streak_date, created_at, foto_url')
      .eq('nis', nisStr)
      .maybeSingle();

    if (errSiswa || !siswa) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    // 2. Data kelas
    let kelasLabel = '-';
    let tingkat = 0;
    let namaKelas = '-';
    if (siswa.kelas_id) {
      const { data: kelas } = await supabase
        .from('kelas')
        .select('nama, tingkat')
        .eq('id', siswa.kelas_id)
        .maybeSingle();
      if (kelas) {
        tingkat = kelas.tingkat;
        namaKelas = kelas.nama;
        kelasLabel = `${convertToRomanNumeral(kelas.tingkat)} ${kelas.nama}`;
      }
    }

    // 3. Ranking kelas (siswa dengan coins lebih banyak di kelas yang sama)
    let rankingKelas = 1;
    if (siswa.kelas_id) {
      const { data: kelasmates } = await supabase
        .from('siswa')
        .select('nis, coins')
        .eq('kelas_id', siswa.kelas_id)
        .eq('is_active', true);
      rankingKelas = (kelasmates || []).filter((s) => (s.coins ?? 0) > (siswa.coins ?? 0)).length + 1;
    }

    // 4. Ranking sekolah
    const { data: allSiswa } = await supabase
      .from('siswa')
      .select('nis, coins')
      .eq('is_active', true);
    const rankingSekolah = (allSiswa || []).filter((s) => (s.coins ?? 0) > (siswa.coins ?? 0)).length + 1;

    // 5. Total tumbler & pelanggaran
    const [tumblerRes, pelanggaranRes] = await Promise.all([
      supabase.from('absensi_tumbler').select('id', { count: 'exact', head: true }).eq('nis', nisStr),
      supabase.from('pelanggaran').select('id', { count: 'exact', head: true }).eq('nis', nisStr).eq('status', 'approved'),
    ]);

    // 6. Achievements yang sudah di-unlock
    const { data: uaRows } = await supabase
      .from('user_achievement')
      .select('unlocked_at, achievement:achievement_id (id, nama, deskripsi, tipe, icon, badge_color)')
      .eq('nis', nisStr)
      .order('unlocked_at', { ascending: false });

    const achievements: ProfilAchievement[] = (uaRows || []).map((ua: any) => {
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

    // 7. Voucher milik siswa
    const { data: voucherRows } = await supabase
      .from('voucher')
      .select('id, kode_voucher, nama_voucher, tanggal_berlaku, tanggal_berakhir, nominal_voucher, tipe_voucher, status, used_at')
      .eq('nis', nisStr)
      .order('created_at', { ascending: false });

    const vouchers: ProfilVoucher[] = (voucherRows || []).map((v: any) => ({
      id: String(v.id ?? ''),
      kodeVoucher: v.kode_voucher ?? '-',
      namaVoucher: v.nama_voucher ?? '-',
      tanggalBerlaku: v.tanggal_berlaku ?? '-',
      tanggalBerakhir: v.tanggal_berakhir ?? '-',
      nominalVoucher: Number(v.nominal_voucher ?? 0),
      tipeVoucher: v.tipe_voucher === 'percentage' ? 'percentage' : 'fixed',
      status: v.status ?? 'available',
      usedAt: v.used_at ?? null,
    }));

    return {
      profil: {
        nis: siswa.nis,
        nama: siswa.nama,
        kelas: kelasLabel,
        tingkat,
        namaKelas,
        coins: siswa.coins ?? 0,
        streak: streakData.currentStreak,
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
    const path = `${nisStr}/avatar.${ext}`;

    // Signed URL untuk upload (valid 60 detik)
    const { data, error } = await supabase.storage
      .from('profil-siswa')
      .createSignedUploadUrl(path);

    if (error) throw new BadRequestException(`Gagal generate upload URL: ${error.message}`);

    const publicUrl = supabase.storage.from('profil-siswa').getPublicUrl(path).data.publicUrl;

    return { uploadUrl: data.signedUrl, publicUrl, path };
  }
}

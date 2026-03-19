import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UpsertShowcaseNoteDto } from './dto/upsert-showcase-note.dto';
import { analyzeShowcaseNote } from 'src/common/utils/showcase-note-moderation.util';

// Validity voucher dari achievement: 30 hari dari unlock
const VOUCHER_VALIDITY_DAYS = 90;

export interface AchievementShowcaseNote {
  id: string;
  nis: string;
  achievementId: number;
  achievementName: string;
  achievementIcon: string;
  achievementBadgeColor: string;
  noteText: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

@Injectable()
export class AchievementService {
  constructor(private supabaseService: SupabaseService) {}

  private mapShowcaseNote(row: any): AchievementShowcaseNote {
    const achievement = Array.isArray(row?.achievement)
      ? row.achievement[0]
      : row?.achievement;

    return {
      id: String(row?.id ?? ''),
      nis: String(row?.nis ?? ''),
      achievementId: Number(row?.achievement_id ?? achievement?.id ?? 0),
      achievementName: achievement?.nama ?? '-',
      achievementIcon: achievement?.icon ?? '🏆',
      achievementBadgeColor: achievement?.badge_color ?? 'blue',
      noteText:
        typeof row?.note_text === 'string' && row.note_text.trim().length > 0
          ? row.note_text.trim()
          : null,
      expiresAt: row?.expires_at ?? null,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  }


  // =====================================================
  // CHECK & UNLOCK ACHIEVEMENTS
  // Dipanggil setelah absensi, transaksi, dsb.
  // eventType: 'tumbler' | 'streak' | 'coins' | 'pelanggaran' | 'transaksi'
  // =====================================================
  async checkAndUnlockAchievements(
    nis: string,
    eventType: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // 1. Ambil semua achievement aktif untuk tipe ini
    const { data: achievements } = await supabase
      .from('achievement')
      .select('id, tipe, target_value, pelanggaran_mode, pelanggaran_period_days, coins_reward, voucher_reward, voucher_nominal, voucher_tipe_voucher')
      .eq('tipe', eventType)
      .eq('is_active', true);

    if (!achievements?.length) return;

    // 2. Ambil achievement yang sudah di-unlock siswa ini
    const achievementIds = achievements.map((a) => a.id);
    const { data: alreadyUnlocked } = await supabase
      .from('user_achievement')
      .select('achievement_id')
      .eq('nis', nis)
      .in('achievement_id', achievementIds);

    const unlockedSet = new Set((alreadyUnlocked || []).map((u) => u.achievement_id));

    // 3. Ambil stats siswa untuk cek eligibility
    const stats = await this.getSiswaStats(nis, eventType);

    // 4. Cek satu per satu
    for (const achievement of achievements) {
      // Skip jika sudah pernah di-unlock
      if (unlockedSet.has(achievement.id)) continue;

      // Cek apakah memenuhi syarat
      const eligible = this.isEligible(achievement, stats);
      if (!eligible) continue;

      // 5. Insert ke user_achievement
      const { error: insertErr } = await supabase
        .from('user_achievement')
        .insert({
          nis,
          achievement_id: achievement.id,
          is_displayed: false,
        })
        .select('id')
        .single();

      // Skip jika sudah ada (race condition)
      if (insertErr) continue;

      // 6. Tambah coins reward (jika ada)
      if (achievement.coins_reward > 0) {
        await supabase.rpc('increment_coins', {
          target_nis: nis,
          amount_to_add: achievement.coins_reward,
        });
      }

      // 7. Buat voucher otomatis (jika voucher_reward = true)
      if (achievement.voucher_reward && achievement.voucher_nominal && achievement.voucher_tipe_voucher) {
        await this.createVoucherFromAchievement(nis, achievement).catch((err) =>
          console.error(`[Achievement] Gagal buat voucher untuk ${nis}:`, err),
        );
      }
    }
  }

  // =====================================================
  // CREATE VOUCHER DARI ACHIEVEMENT
  //
  // Aturan:
  // • Validity: 90 hari dari tanggal unlock
  // • 1x seumur hidup per siswa per achievement
  //   → Dijamin oleh constraint UNIQUE (nis, achievement_id)
  //     di tabel user_achievement. Karena voucher dibuat SETELAH
  //     insert user_achievement berhasil, dan insert hanya bisa
  //     berhasil 1x, maka voucher otomatis juga hanya 1x.
  // • Kode format: ACH-YYYYMMDD-XXXX
  // • created_by = NULL (otomatis dari sistem)
  // =====================================================
  private async createVoucherFromAchievement(
    nis: string,
    achievement: {
      id: number;
      voucher_nominal: number;
      voucher_tipe_voucher: string;
    },
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Ambil info achievement untuk nama voucher
    const { data: achInfo } = await supabase
      .from('achievement')
      .select('nama, icon')
      .eq('id', achievement.id)
      .maybeSingle();

    const today = new Date();
    const berlaku = today.toISOString().split('T')[0];
    const berakhirDate = new Date(today);
    berakhirDate.setDate(berakhirDate.getDate() + VOUCHER_VALIDITY_DAYS);
    const berakhir = berakhirDate.toISOString().split('T')[0];

    // Generate kode voucher unik
    const kode = await this.generateKodeVoucher();

    const namaVoucher = achInfo
      ? `${achInfo.icon || '🏆'} ${achInfo.nama}`
      : `Reward Achievement #${achievement.id}`;

    await supabase.from('voucher').insert([{
      kode_voucher: kode,
      nama_voucher: namaVoucher,
      tanggal_berlaku: berlaku,
      tanggal_berakhir: berakhir,
      nis,
      nominal_voucher: achievement.voucher_nominal,
      tipe_voucher: achievement.voucher_tipe_voucher,
      status: 'available',
      created_by: null, // otomatis dari sistem
    }]);
  }

  // =====================================================
  // GENERATE KODE VOUCHER UNIK
  // =====================================================
  private async generateKodeVoucher(): Promise<string> {
    const supabase = this.supabaseService.getClient();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let i = 0; i < 10; i++) {
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const kode = `ACH-${date}-${random}`;

      const { data } = await supabase
        .from('voucher')
        .select('id')
        .eq('kode_voucher', kode)
        .maybeSingle();

      if (!data) return kode;
    }

    throw new Error('Gagal generate kode voucher unik');
  }

  // =====================================================
  // GET STATS SISWA
  // Mengambil data yang relevan berdasarkan eventType
  // =====================================================
  private async getSiswaStats(
    nis: string,
    eventType: string,
  ): Promise<{
    streak: number;
    coins: number;
    tumblerCount: number;
    pelanggaranCount: number;
    pelanggaranDates: string[];
    transaksiCount: number;
  }> {
    const supabase = this.supabaseService.getClient();

    // Selalu ambil streak + coins dari tabel siswa (cepat, 1 query)
    const { data: siswa } = await supabase
      .from('siswa')
      .select('streak, coins')
      .eq('nis', nis)
      .maybeSingle();

    let tumblerCount = 0;
    let pelanggaranCount = 0;
    let pelanggaranDates: string[] = [];
    let transaksiCount = 0;

    // Ambil data tambahan hanya jika diperlukan
    if (eventType === 'tumbler') {
      const { count } = await supabase
        .from('absensi_tumbler')
        .select('id', { count: 'exact', head: true })
        .eq('nis', nis);
      tumblerCount = count || 0;
    }

    if (eventType === 'pelanggaran') {
      const { data } = await supabase
        .from('pelanggaran')
        .select('created_at')
        .eq('nis', nis)
        .eq('status', 'approved');
      pelanggaranDates = (data ?? [])
        .map((row: any) => row.created_at)
        .filter((value: unknown) => typeof value === 'string');
      pelanggaranCount = pelanggaranDates.length;
    }

    if (eventType === 'transaksi') {
      const { count } = await supabase
        .from('transaksi')
        .select('id', { count: 'exact', head: true })
        .eq('nis', nis);
      transaksiCount = count || 0;
    }

    return {
      streak: siswa?.streak || 0,
      coins: siswa?.coins || 0,
      tumblerCount,
      pelanggaranCount,
      pelanggaranDates,
      transaksiCount,
    };
  }

  // =====================================================
  // CEK ELIGIBILITY
  // =====================================================
  private isEligible(
    achievement: {
      tipe: string;
      target_value: number;
      pelanggaran_mode?: string | null;
      pelanggaran_period_days?: number | null;
    },
    stats: {
      streak: number;
      coins: number;
      tumblerCount: number;
      pelanggaranCount: number;
      pelanggaranDates: string[];
      transaksiCount: number;
    },
  ): boolean {
    switch (achievement.tipe) {
      case 'streak':
        return stats.streak >= achievement.target_value;
      case 'coins':
        return stats.coins >= achievement.target_value;
      case 'tumbler':
        return stats.tumblerCount >= achievement.target_value;
      case 'pelanggaran':
        if (achievement.pelanggaran_mode === 'no_violation_days') {
          const days = Number(achievement.pelanggaran_period_days ?? 0);
          if (!Number.isInteger(days) || days < 1) return false;

          const start = new Date();
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() - (days - 1));
          const startMs = start.getTime();

          return stats.pelanggaranDates.every((createdAt) => {
            const violationDate = new Date(createdAt);
            if (Number.isNaN(violationDate.getTime())) return true;
            return violationDate.getTime() < startMs;
          });
        }

        // mode count: target_value=0 artinya harus tidak ada pelanggaran total
        return stats.pelanggaranCount === achievement.target_value;
      case 'transaksi':
        return stats.transaksiCount >= achievement.target_value;
      default:
        return false;
    }
  }

  // =====================================================
  // GET UNDISPLAYED ACHIEVEMENTS (untuk popup)
  // =====================================================
  async getUndisplayedAchievements(nis: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('user_achievement')
      .select(`
        id,
        unlocked_at,
        achievement:achievement_id (
          id, nama, deskripsi, icon, badge_color, coins_reward,
          voucher_reward, voucher_nominal, voucher_tipe_voucher
        )
      `)
      .eq('nis', nis)
      .eq('is_displayed', false)
      .order('unlocked_at', { ascending: true });

    if (error) return { success: true, message: 'OK', data: [] };

    return {
      success: true,
      message: 'OK',
      data: (data || []).map((ua) => {
        const ach = Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement;
        return {
          id: ua.id, // id dari user_achievement (dipakai untuk mark-displayed)
          unlockedAt: ua.unlocked_at,
          nama: ach?.nama ?? '',
          deskripsi: ach?.deskripsi ?? '',
          icon: ach?.icon ?? '🏆',
          badgeColor: ach?.badge_color ?? 'blue',
          coinsReward: ach?.coins_reward ?? 0,
          // Info tambahan: apakah ada voucher yang dibuat
          hasVoucher: ach?.voucher_reward === true,
          voucherNominal: ach?.voucher_nominal || null,
          voucherTipe: ach?.voucher_tipe_voucher || null,
        };
      }),
    };
  }

  // =====================================================
  // MARK AS DISPLAYED
  // =====================================================
  async markAsDisplayed(ids: number[]) {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('user_achievement')
      .update({ is_displayed: true })
      .in('id', ids);
    return { success: true, message: 'Achievement updated' };
  }

  // =====================================================
  // GET UNLOCKED ACHIEVEMENTS (untuk halaman profil)
  // =====================================================
  async getUnlockedAchievements(nis: string) {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('user_achievement')
      .select(`
        id, unlocked_at,
        achievement:achievement_id (
          id, nama, deskripsi, icon, badge_color, coins_reward,
          voucher_reward, voucher_nominal, voucher_tipe_voucher
        )
      `)
      .eq('nis', nis)
      .order('unlocked_at', { ascending: false });

    return { success: true, message: 'OK', data: data || [] };
  }

  async getShowcaseOptions(nis: string) {
    const unlocked = await this.getUnlockedAchievements(nis);

    return {
      success: true,
      message: 'OK',
      data: (unlocked.data || []).map((ua: any) => {
        const ach = Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement;
        return {
          achievementId: Number(ach?.id ?? 0),
          nama: ach?.nama ?? '-',
          deskripsi: ach?.deskripsi ?? null,
          icon: ach?.icon ?? '🏆',
          badgeColor: ach?.badge_color ?? 'blue',
          unlockedAt: ua?.unlocked_at ?? null,
        };
      }),
    };
  }

  async getActiveShowcaseNote(nis: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('achievement_showcase_note')
      .select(`
        id,
        nis,
        achievement_id,
        note_text,
        expires_at,
        created_at,
        updated_at,
        achievement:achievement_id (
          id, nama, icon, badge_color
        )
      `)
      .eq('nis', nis)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return { success: true, message: 'OK', data: null };
    }

    return {
      success: true,
      message: 'OK',
      data: this.mapShowcaseNote(data),
    };
  }

  async upsertShowcaseNote(nis: string, dto: UpsertShowcaseNoteDto) {
    const supabase = this.supabaseService.getClient();
    const achievementId = Number(dto?.achievementId ?? 0);
    const noteText =
      typeof dto?.noteText === 'string' && dto.noteText.trim().length > 0
        ? dto.noteText.trim().slice(0, 100)
        : null;

    if (!achievementId) {
      throw new BadRequestException('Achievement harus dipilih');
    }

    const moderation = analyzeShowcaseNote(noteText);

    if (noteText && moderation.hasProfanity) {
      throw new BadRequestException(
        'Catatan mengandung kata yang tidak pantas. Silakan perbaiki sebelum disimpan.',
      );
    }

    const { data: existingNote, error: existingNoteError } = await supabase
      .from('achievement_showcase_note')
      .select('id, expires_at')
      .eq('nis', nis)
      .eq('is_active', true)
      .maybeSingle();

    if (existingNoteError) {
      throw new BadRequestException(
        `Gagal memeriksa catatan showcase aktif: ${existingNoteError.message}`,
      );
    }

    if (
      existingNote?.id &&
      existingNote.expires_at &&
      new Date(existingNote.expires_at).getTime() > Date.now()
    ) {
      throw new BadRequestException(
        'Catatan aktif sudah ada. Hapus catatan yang sekarang terlebih dahulu.',
      );
    }

    const { data: ownership, error: ownershipError } = await supabase
      .from('user_achievement')
      .select('achievement_id')
      .eq('nis', nis)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (ownershipError || !ownership) {
      throw new BadRequestException(
        'Achievement tidak ditemukan pada akun siswa ini',
      );
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      nis,
      achievement_id: achievementId,
      note_text: noteText,
      is_active: true,
      expires_at: expiresAt,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from('achievement_showcase_note')
      .upsert(payload, { onConflict: 'nis' })
      .select(`
        id,
        nis,
        achievement_id,
        note_text,
        expires_at,
        created_at,
        updated_at,
        achievement:achievement_id (
          id, nama, icon, badge_color
        )
      `)
      .single();

    if (error) {
      throw new BadRequestException(
        `Gagal menyimpan catatan showcase: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Catatan showcase berhasil disimpan',
      data: this.mapShowcaseNote(data),
    };
  }

  async removeShowcaseNote(nis: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('achievement_showcase_note')
      .delete()
      .eq('nis', nis);

    if (error) {
      throw new BadRequestException(
        `Gagal menghapus catatan showcase: ${error.message}`,
      );
    }

    return { success: true, message: 'Catatan showcase berhasil dihapus' };
  }
}

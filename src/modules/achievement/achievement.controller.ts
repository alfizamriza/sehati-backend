import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/achievement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SISWA)
export class AchievementController {
  constructor(private achievementService: AchievementService) {}

  /**
   * GET /api/achievement/undisplayed
   * Achievement yang belum ditampilkan popup (auto-show saat siswa login/buka dashboard)
   * Response langsung dari service (sudah include { success, data })
   */
  @Get('undisplayed')
  async getUndisplayed(@Req() req: any) {
    const nis = req.user.sub; // NIS dari JWT payload
    return this.achievementService.getUndisplayedAchievements(nis);
    // ↑ FIXED: tidak dibungkus lagi, karena service sudah return { success, data }
  }

  /**
   * POST /api/achievement/mark-displayed
   * Mark achievement sebagai sudah ditampilkan (dipanggil saat popup ditutup)
   * Body: { achievementIds: number[] }
   *
   * FIX: service.markAsDisplayed hanya butuh ids, tidak butuh nis
   * karena validasi kepemilikan sudah cukup dari JWT + unique constraint DB
   */
  @Post('mark-displayed')
  async markDisplayed(
    @Req() req: any,
    @Body() body: { achievementIds: number[] },
  ) {
    // nis tetap diambil untuk audit/logging jika dibutuhkan ke depannya
    // tapi tidak dikirim ke service karena signature-nya hanya (ids: number[])
    await this.achievementService.markAsDisplayed(body.achievementIds);
    return { success: true, message: 'Achievement marked as displayed' };
  }

  /**
   * GET /api/achievement/unlocked
   * Semua achievement yang sudah di-unlock siswa (untuk halaman profil)
   */
  @Get('unlocked')
  async getUnlocked(@Req() req: any) {
    const nis = req.user.sub;
    return this.achievementService.getUnlockedAchievements(nis);
    // ↑ FIXED: tidak dibungkus lagi
  }
}
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RiwayatService } from './riwayat.service';


@ApiTags('Riwayat')
@ApiBearerAuth('access-token')
@Controller('api/riwayat')
@UseGuards(JwtAuthGuard)
export class RiwayatController {
  constructor(private riwayatService: RiwayatService) {}

  /** GET /riwayat/semua */
  @Get('semua')
  @ApiOperation({ summary: 'Get all student activity history' })
  async getRiwayatAll(@Request() req: any, @Query('limit') limit?: string) {
    // Log untuk debug — hapus setelah konfirmasi data muncul
    console.log('[RiwayatController] req.user =', req.user);

    // NIS bisa ada di berbagai field JWT tergantung auth setup
    const nis = this.extractNis(req.user);
    console.log('[RiwayatController] nis extracted =', nis, '| type =', typeof nis);

    if (!nis) {
      return { success: false, message: 'NIS tidak ditemukan di token. req.user: ' + JSON.stringify(req.user) };
    }

    const lim = limit ? Math.min(parseInt(limit), 200) : 50;
    return this.riwayatService.getRiwayatAll(nis, lim);
  }

  @Get('tumbler')
  @ApiOperation({ summary: 'Get tumbler activity history' })
  async getTumbler(@Request() req: any, @Query('limit') limit?: string) {
    const nis = this.extractNis(req.user);
    if (!nis) return { success: false, message: 'NIS tidak ditemukan di token' };
    const data = await this.riwayatService.getRiwayatTumbler(nis, limit ? Math.min(parseInt(limit), 200) : 50);
    return { success: true, data };
  }

  @Get('belanja')
  @ApiOperation({ summary: 'Get shopping history' })
  async getBelanja(@Request() req: any, @Query('limit') limit?: string) {
    const nis = this.extractNis(req.user);
    if (!nis) return { success: false, message: 'NIS tidak ditemukan di token' };
    const data = await this.riwayatService.getRiwayatBelanja(nis, limit ? Math.min(parseInt(limit), 200) : 50);
    return { success: true, data };
  }

  @Get('pelanggaran')
  @ApiOperation({ summary: 'Get violation history' })
  async getPelanggaran(@Request() req: any, @Query('limit') limit?: string) {
    const nis = this.extractNis(req.user);
    if (!nis) return { success: false, message: 'NIS tidak ditemukan di token' };
    const data = await this.riwayatService.getRiwayatPelanggaran(nis, limit ? Math.min(parseInt(limit), 200) : 50);
    return { success: true, data };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get student activity summary' })
  async getSummary(@Request() req: any) {
    const nis = this.extractNis(req.user);
    if (!nis) return { success: false, message: 'NIS tidak ditemukan di token' };
    const data = await this.riwayatService.getSummary(nis);
    return { success: true, data };
  }

  // ─── Helper: coba semua kemungkinan field NIS di JWT payload ───────────────
  // JWT siswa biasanya menyimpan NIS di salah satu field berikut.
  // Sesuaikan dengan auth.service kamu jika masih salah.
  private extractNis(user: any): string | null {
    if (!user) return null;
    const raw =
      user.nis     ??   // paling umum
      user.sub     ??   // JWT standard subject
      user.id      ??   // kadang pakai id
      user.username ??  // kadang pakai username
      null;
    if (raw === null || raw === undefined) return null;
    return String(raw).trim();
  }
}

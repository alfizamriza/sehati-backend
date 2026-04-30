import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Request, Response } from 'express';

interface AuthRequest extends Request {
  user: {
    sub: string; // id utama dari JWT payload (nis/nip/id)
    role: 'siswa' | 'guru' | 'admin';
  };
}

@ApiTags('Leaderboard')
@ApiBearerAuth('access-token')
@Controller('api/leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // ─────────────────────────────────────────────
  // GET /leaderboard/kelas-saya
  //   Siswa        → semua siswa sekelas, posisi diri ditandai
  //   Guru / Admin → ?kelas_id=xx wajib; null = semua siswa
  // ─────────────────────────────────────────────
  @Get('kelas-saya')
  @ApiOperation({ summary: 'Get class leaderboard for current user or selected class' })
  getKelasSaya(@Req() req: AuthRequest, @Query('kelas_id') kelasId?: string) {
    if (req.user.role === 'siswa') {
      return this.leaderboardService.getKelasSaya(req.user.sub);
    }

    const parsedId = kelasId ? parseInt(kelasId, 10) : null;
    return this.leaderboardService.getKelasByIdAdmin(parsedId);
  }

  // ─────────────────────────────────────────────
  // GET /leaderboard/antar-kelas?jenjang=SMA
  //   Semua role   → ranking kelas by avg coins
  //   Siswa        → is_my_class otomatis ditandai
  //   ?jenjang     → opsional filter SD / SMP / SMA
  // ─────────────────────────────────────────────
  @Get('antar-kelas')
  @ApiOperation({ summary: 'Get inter-class leaderboard' })
  getAntarKelas(@Req() req: AuthRequest, @Query('jenjang') jenjang?: string) {
    const nisLogin = req.user.role === 'siswa' ? req.user.sub : undefined;
    return this.leaderboardService.getAntarKelas(nisLogin, jenjang);
  }

  // ─────────────────────────────────────────────
  // GET /leaderboard/sekolah
  //   Semua role   → semua siswa aktif se-sekolah
  //   Siswa        → is_me otomatis ditandai
  // ─────────────────────────────────────────────
  @Get('sekolah')
  @ApiOperation({ summary: 'Get school-wide leaderboard' })
  getSekolah(@Req() req: AuthRequest) {
    const nisLogin = req.user.role === 'siswa' ? req.user.sub : undefined;
    return this.leaderboardService.getSekolah(nisLogin);
  }

  // ─────────────────────────────────────────────
  // GET /leaderboard/antar-jenjang
  //   Semua role   → ranking SD / SMP / SMA by avg coins
  // ─────────────────────────────────────────────
  @Get('antar-jenjang')
  @ApiOperation({ summary: 'Get cross-level leaderboard' })
  getAntarJenjang() {
    return this.leaderboardService.getAntarJenjang();
  }

  // ─────────────────────────────────────────────
  // GET /leaderboard/siswa-antar-jenjang?jenjang=SMA
  //   Siswa        → otomatis jenjang sendiri, is_me ditandai
  //   Guru / Admin → ?jenjang wajib diisi (SD | SMP | SMA)
  // ─────────────────────────────────────────────
  @Get('siswa-antar-jenjang')
  @ApiOperation({ summary: 'Get student leaderboard across education levels' })
  getSiswaAntarJenjang(
    @Req() req: AuthRequest,
    @Query('jenjang') jenjang?: string,
  ) {
    if (req.user.role === 'siswa') {
      return this.leaderboardService.getSiswaAntarJenjang(req.user.sub);
    }

    if (!jenjang || !['SD', 'SMP', 'SMA'].includes(jenjang)) {
      throw new BadRequestException(
        'Parameter jenjang diperlukan dan harus salah satu dari: SD, SMP, SMA',
      );
    }
    return this.leaderboardService.getSiswaByJenjang(jenjang);
  }

  // ─────────────────────────────────────────────
  // GET /leaderboard/export?type=sekolah&kelas_id=...
  //   Returns PDF file of specified leaderboard for guru/admin
  // ─────────────────────────────────────────────
  @Get('export')
  @ApiOperation({ summary: 'Export leaderboard data as PDF' })
  async exportPdf(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: any,
    @Query('type') type: string,
    @Query('kelas_id') kelasId?: string,
    @Query('jenjang') jenjang?: string,
  ) {
    // only guru and admin can export
    if (req.user.role === 'siswa') {
      throw new BadRequestException('Hanya guru/admin yang dapat mengakses ekspor.');
    }

    let rows: any[] = [];
    let title = 'Leaderboard';

    switch (type) {
      case 'kelas':
        {
          const parsed = kelasId ? parseInt(kelasId, 10) : null;
          rows = await this.leaderboardService.getKelasByIdAdmin(parsed);
          title = parsed ? `Leaderboard Kelas ${parsed}` : 'Leaderboard Semua Kelas';
        }
        break;
      case 'sekolah':
        rows = await this.leaderboardService.getSekolah();
        title = 'Leaderboard Sekolah';
        break;
      case 'antar-kelas':
        rows = await this.leaderboardService.getAntarKelas(undefined, jenjang);
        title = 'Leaderboard Antar Kelas';
        break;
      case 'antar-jenjang':
        rows = await this.leaderboardService.getAntarJenjang();
        title = 'Leaderboard Antar Jenjang';
        break;
      case 'siswa-antar-jenjang':
        if (!jenjang || !['SD', 'SMP', 'SMA'].includes(jenjang)) {
          throw new BadRequestException('Parameter jenjang diperlukan untuk ekspor.');
        }
        rows = await this.leaderboardService.getSiswaByJenjang(jenjang);
        title = `Leaderboard siswa ${jenjang}`;
        break;
      default:
        throw new BadRequestException('Type ekspor tidak dikenal');
    }

    const pdfBuffer = await this.leaderboardService.generateLeaderboardPdf(rows, title);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="leaderboard_${type}.pdf"`);
    
    return new StreamableFile(pdfBuffer);
  }
}

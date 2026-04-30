import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, Req,
  ForbiddenException, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GuruDashboardService } from '../services/guru-dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Guru Dashboard')
@ApiBearerAuth('access-token')
@Controller('api/guru/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GURU)
export class GuruDashboardController {
  constructor(private guruDashboardService: GuruDashboardService) {}

  // ─── HELPER: pastikan user adalah konselor ────────────────────
  private requireKonselor(req: any) {
    if (req.user?.peran !== 'konselor') {
      throw new ForbiddenException('Hanya konselor yang dapat mengakses fitur ini');
    }
  }

  // =====================================================
  // GET /api/guru/dashboard/profil
  // =====================================================
  @Get('profil')
  @ApiOperation({ summary: 'Get teacher dashboard profile summary' })
  async getProfil(@Req() req: any) {
    return this.guruDashboardService.getProfilGuru(req.user.sub);
  }

  // =====================================================
  // GET /api/guru/dashboard/kelas
  // =====================================================
  @Get('kelas')
  @ApiOperation({ summary: 'Get class list for teacher dashboard' })
  async getKelasList() {
    return this.guruDashboardService.getKelasList();
  }

  // =====================================================
  // GET /api/guru/dashboard/statistik/:kelasId
  // =====================================================
  @Get('statistik/:kelasId')
  @ApiOperation({ summary: 'Get class statistics by class ID' })
  async getStatistik(@Param('kelasId', ParseIntPipe) kelasId: number) {
    return this.guruDashboardService.getStatistikKelas(kelasId);
  }

  // =====================================================
  // GET /api/guru/dashboard/top-siswa/:kelasId
  // =====================================================
  @Get('top-siswa/:kelasId')
  @ApiOperation({ summary: 'Get top students for a class' })
  async getTopSiswa(
    @Param('kelasId', ParseIntPipe) kelasId: number,
    @Query('limit') limit?: string,
  ) {
    return this.guruDashboardService.getTopSiswa(kelasId, limit ? parseInt(limit) : 5);
  }

  // =====================================================
  // GET /api/guru/dashboard/pelanggaran-terbaru
  // Query: kelasId? (opsional, untuk filter wali kelas)
  // =====================================================
  @Get('pelanggaran-terbaru')
  @ApiOperation({ summary: 'Get latest violations for dashboard' })
  async getPelanggaranTerbaru(
    @Query('kelasId') kelasId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.guruDashboardService.getRiwayatPelanggaran(
      kelasId ? parseInt(kelasId) : undefined,
      limit ? parseInt(limit) : 5,
    );
  }

  // GET /api/guru/dashboard/riwayat-pelanggaran
  @Get('riwayat-pelanggaran')
  @ApiOperation({ summary: 'Get full violation history for counselor' })
  async getRiwayatPelanggaranKonselor(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.getSemuaRiwayatPelanggaran(
      limit ? parseInt(limit, 10) : 200,
    );
  }

  // ─── KONSELOR ONLY: CRUD JENIS PELANGGARAN ──────────────────────

  // GET /api/guru/dashboard/jenis-pelanggaran
  @Get('jenis-pelanggaran')
  @ApiOperation({ summary: 'Get violation types for counselor dashboard' })
  async getJenisPelanggaran(@Req() req: any) {
    this.requireKonselor(req);
    return this.guruDashboardService.getJenisPelanggaran();
  }

  // POST /api/guru/dashboard/jenis-pelanggaran
  @Post('jenis-pelanggaran')
  @ApiOperation({ summary: 'Create violation type from counselor dashboard' })
  async createJenisPelanggaran(@Req() req: any, @Body() body: {
    nama: string;
    kategori: 'ringan' | 'sedang' | 'berat';
    bobot_coins: number;
    deskripsi?: string;
  }) {
    this.requireKonselor(req);
    return this.guruDashboardService.createJenisPelanggaran(body);
  }

  // PUT /api/guru/dashboard/jenis-pelanggaran/:id
  @Put('jenis-pelanggaran/:id')
  @ApiOperation({ summary: 'Update violation type by ID from counselor dashboard' })
  async updateJenisPelanggaran(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.updateJenisPelanggaran(id, body);
  }

  // DELETE /api/guru/dashboard/jenis-pelanggaran/:id
  @Delete('jenis-pelanggaran/:id')
  @ApiOperation({ summary: 'Delete violation type by ID from counselor dashboard' })
  async deleteJenisPelanggaran(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.deleteJenisPelanggaran(id);
  }

  // PATCH /api/guru/dashboard/jenis-pelanggaran/:id/toggle
  @Patch('jenis-pelanggaran/:id/toggle')
  @ApiOperation({ summary: 'Toggle violation type active status' })
  async toggleJenisPelanggaran(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.toggleJenisPelanggaran(id);
  }

  // PATCH /api/guru/dashboard/pelanggaran/:id/status
  @Patch('pelanggaran/:id/status')
  @ApiOperation({ summary: 'Approve or reject violation report by ID' })
  async updatePelanggaranStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'approved' | 'rejected' },
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.updatePelanggaranStatus(id, body.status, req.user.sub);
  }
}

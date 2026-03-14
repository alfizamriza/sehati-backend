import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, Req,
  ForbiddenException, ParseIntPipe,
} from '@nestjs/common';
import { GuruDashboardService } from '../services/guru-dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

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
  async getProfil(@Req() req: any) {
    return this.guruDashboardService.getProfilGuru(req.user.sub);
  }

  // =====================================================
  // GET /api/guru/dashboard/kelas
  // =====================================================
  @Get('kelas')
  async getKelasList() {
    return this.guruDashboardService.getKelasList();
  }

  // =====================================================
  // GET /api/guru/dashboard/statistik/:kelasId
  // =====================================================
  @Get('statistik/:kelasId')
  async getStatistik(@Param('kelasId', ParseIntPipe) kelasId: number) {
    return this.guruDashboardService.getStatistikKelas(kelasId);
  }

  // =====================================================
  // GET /api/guru/dashboard/top-siswa/:kelasId
  // =====================================================
  @Get('top-siswa/:kelasId')
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
  async getJenisPelanggaran(@Req() req: any) {
    this.requireKonselor(req);
    return this.guruDashboardService.getJenisPelanggaran();
  }

  // POST /api/guru/dashboard/jenis-pelanggaran
  @Post('jenis-pelanggaran')
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
  async deleteJenisPelanggaran(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.deleteJenisPelanggaran(id);
  }

  // PATCH /api/guru/dashboard/jenis-pelanggaran/:id/toggle
  @Patch('jenis-pelanggaran/:id/toggle')
  async toggleJenisPelanggaran(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.toggleJenisPelanggaran(id);
  }

  // PATCH /api/guru/dashboard/pelanggaran/:id/status
  @Patch('pelanggaran/:id/status')
  async updatePelanggaranStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'approved' | 'rejected' },
  ) {
    this.requireKonselor(req);
    return this.guruDashboardService.updatePelanggaranStatus(id, body.status, req.user.sub);
  }
}

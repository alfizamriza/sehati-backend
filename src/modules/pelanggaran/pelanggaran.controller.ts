import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { PelanggaranService } from './pelanggaran.service';
import { CreatePelanggaranDto } from './dto/create-pelanggaran.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/pelanggaran')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.GURU, UserRole.ADMIN, UserRole.SISWA)
@Permissions('manage_pelanggaran')
export class PelanggaranController {
  constructor(private readonly pelanggaranService: PelanggaranService) {}

  // GET /pelanggaran/kelas
  @Get('kelas')
  getKelasList() {
    return this.pelanggaranService.getKelasList();
  }

  // GET /pelanggaran/kelas/:kelasId/siswa
  @Get('kelas/:kelasId/siswa')
  getSiswaByKelas(@Param('kelasId', ParseIntPipe) kelasId: number) {
    return this.pelanggaranService.getSiswaByKelas(kelasId);
  }

  // GET /pelanggaran/jenis
  @Get('jenis')
  getJenisPelanggaranAktif() {
    return this.pelanggaranService.getJenisPelanggaranAktif();
  }

  // GET /pelanggaran/riwayat/saya
  // PENTING: harus SEBELUM :id agar tidak bentrok dengan route :id
  @Get('riwayat/saya')
  getRiwayatSaya(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.pelanggaranService.getRiwayatByPelapor({
      role: req.user?.role,
      guruNip: req.user?.role === UserRole.GURU ? req.user?.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user?.sub : null,
    }, limit ? parseInt(limit) : 100);
  }

  // POST /pelanggaran
  @Post()
  createPelanggaran(@Body() dto: CreatePelanggaranDto, @Request() req: any) {
    return this.pelanggaranService.createPelanggaran(dto, {
      role: req.user?.role,
      guruNip: req.user?.role === UserRole.GURU ? req.user?.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user?.sub : null,
    });
  }

  // PATCH /pelanggaran/:id/bukti
  @Patch(':id/bukti')
  updateBuktiFoto(
    @Param('id', ParseIntPipe) id: number,
    @Body('bukti_foto_url') buktiUrl: string,
    @Request() req: any,
  ) {
    return this.pelanggaranService.updateBuktiFoto(id, buktiUrl, {
      role: req.user?.role,
      guruNip: req.user?.role === UserRole.GURU ? req.user?.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user?.sub : null,
    });
  }

  // PATCH /pelanggaran/:id
  // Edit jenis pelanggaran & catatan — hanya jika status pending & milik guru sendiri
  @Patch(':id')
  updatePelanggaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { jenis_pelanggaran_id?: number; catatan?: string },
    @Request() req: any,
  ) {
    return this.pelanggaranService.updatePelanggaran(id, body, {
      role: req.user?.role,
      guruNip: req.user?.role === UserRole.GURU ? req.user?.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user?.sub : null,
    });
  }

  // DELETE /pelanggaran/:id
  // Hapus laporan — hanya jika status pending & milik guru sendiri
  @Delete(':id')
  deletePelanggaran(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.pelanggaranService.deletePelanggaran(id, {
      role: req.user?.role,
      guruNip: req.user?.role === UserRole.GURU ? req.user?.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user?.sub : null,
    });
  }
}

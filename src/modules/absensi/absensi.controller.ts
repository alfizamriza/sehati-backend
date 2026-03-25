import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AbsensiService } from './absensi.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@Controller('api/absensi')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AbsensiController {
  constructor(private absensiService: AbsensiService) {}

  // =====================================================
  // SCAN QR
  // Dipanggil dari halaman scan guru/Siswa OSIS
  // Body: { nis } — NIS didapat dari hasil decode QR
  // =====================================================
  @Post('scan')
  @Roles(UserRole.GURU, UserRole.SISWA)
  @Permissions('manage_absensi')
  async scan(@Req() req: any, @Body() body: { nis: string }) {
    return this.absensiService.scanAbsensi(body.nis, {
      guruNip: req.user?.role === UserRole.GURU ? req.user.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user.sub : null,
    });
  }

  // =====================================================
  // ABSEN MANUAL 1 SISWA
  // =====================================================
  @Post('manual')
  @Roles(UserRole.GURU, UserRole.SISWA)
  @Permissions('manage_absensi')
  async manualSatu(@Req() req: any, @Body() body: { nis: string }) {
    return this.absensiService.manualAbsensi(body.nis, {
      guruNip: req.user?.role === UserRole.GURU ? req.user.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user.sub : null,
    });
  }

  // =====================================================
  // ABSEN MANUAL BULK
  // Body: { nisList: ['001', '002', '003'] }
  // Dipakai saat guru/Siswa OSIS centang banyak siswa sekaligus
  // =====================================================
  @Post('manual/bulk')
  @Roles(UserRole.GURU, UserRole.SISWA)
  @Permissions('manage_absensi')
  async manualBulk(@Req() req: any, @Body() body: { nisList: string[] }) {
    return this.absensiService.bulkManualAbsensi(body.nisList, {
      guruNip: req.user?.role === UserRole.GURU ? req.user.sub : null,
      siswaNis: req.user?.role === UserRole.SISWA ? req.user.sub : null,
    });
  }

  // =====================================================
  // GET DAFTAR KELAS
  // Untuk dropdown pilih kelas di halaman absen manual
  // =====================================================
  @Get('kelas')
  @Roles(UserRole.GURU, UserRole.ADMIN, UserRole.SISWA)
  @Permissions('manage_absensi')
  async getKelas() {
    return this.absensiService.getKelasList();
  }

  // =====================================================
  // GET SISWA PER KELAS + STATUS ABSEN HARI INI
  // Untuk menampilkan list siswa di halaman absen manual
  // Response: [{ nis, nama, streak, sudahAbsen: true/false }]
  // =====================================================
  @Get('kelas/:kelasId/siswa')
  @Roles(UserRole.GURU, UserRole.ADMIN, UserRole.SISWA)
  @Permissions('manage_absensi')
  async getSiswaByKelas(@Param('kelasId', ParseIntPipe) kelasId: number) {
    return this.absensiService.getSiswaByKelas(kelasId);
  }

  // =====================================================
  // GET STATUS ABSEN HARI INI (1 SISWA)
  // Dipanggil setelah scan QR untuk konfirmasi
  // =====================================================
  @Get('status/:nis')
  @Roles(UserRole.GURU, UserRole.ADMIN, UserRole.SISWA)
  @Permissions('manage_absensi')
  async getStatus(@Param('nis') nis: string) {
    return this.absensiService.getStatusHariIni(nis);
  }

  // =====================================================
  // GET RIWAYAT ABSENSI SISWA
  // Bisa dipanggil guru atau siswa itu sendiri
  // =====================================================
  @Get('riwayat/:nis')
  @Roles(UserRole.GURU, UserRole.SISWA, UserRole.ADMIN)
  async getRiwayat(@Param('nis') nis: string) {
    return this.absensiService.getRiwayat(nis);
  }

  // =====================================================
  // GET INFO HARI INI — apakah hari libur?
  // Dipanggil frontend sebelum buka halaman absensi
  // Tidak perlu auth — boleh diakses siapa saja
  // =====================================================
  @Get('info-hari-ini')
  async getInfoHariIni() {
    return this.absensiService.getInfoHariIni();
  }

}

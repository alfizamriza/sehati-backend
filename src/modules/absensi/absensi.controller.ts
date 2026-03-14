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

@Controller('api/absensi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsensiController {
  constructor(private absensiService: AbsensiService) {}

  // =====================================================
  // SCAN QR
  // Dipanggil dari halaman scan guru
  // Body: { nis } — NIS didapat dari hasil decode QR
  // =====================================================
  @Post('scan')
  @Roles(UserRole.GURU)
  async scan(@Req() req: any, @Body() body: { nis: string }) {
    const nip = req.user.sub;
    return this.absensiService.scanAbsensi(body.nis, nip);
  }

  // =====================================================
  // ABSEN MANUAL 1 SISWA
  // =====================================================
  @Post('manual')
  @Roles(UserRole.GURU)
  async manualSatu(@Req() req: any, @Body() body: { nis: string }) {
    const nip = req.user.sub;
    return this.absensiService.manualAbsensi(body.nis, nip);
  }

  // =====================================================
  // ABSEN MANUAL BULK
  // Body: { nisList: ['001', '002', '003'] }
  // Dipakai saat guru centang banyak siswa sekaligus
  // =====================================================
  @Post('manual/bulk')
  @Roles(UserRole.GURU)
  async manualBulk(@Req() req: any, @Body() body: { nisList: string[] }) {
    const nip = req.user.sub;
    return this.absensiService.bulkManualAbsensi(body.nisList, nip);
  }

  // =====================================================
  // GET DAFTAR KELAS
  // Untuk dropdown pilih kelas di halaman absen manual
  // =====================================================
  @Get('kelas')
  @Roles(UserRole.GURU)
  async getKelas() {
    return this.absensiService.getKelasList();
  }

  // =====================================================
  // GET SISWA PER KELAS + STATUS ABSEN HARI INI
  // Untuk menampilkan list siswa di halaman absen manual
  // Response: [{ nis, nama, streak, sudahAbsen: true/false }]
  // =====================================================
  @Get('kelas/:kelasId/siswa')
  @Roles(UserRole.GURU)
  async getSiswaByKelas(@Param('kelasId', ParseIntPipe) kelasId: number) {
    return this.absensiService.getSiswaByKelas(kelasId);
  }

  // =====================================================
  // GET STATUS ABSEN HARI INI (1 SISWA)
  // Dipanggil setelah scan QR untuk konfirmasi
  // =====================================================
  @Get('status/:nis')
  @Roles(UserRole.GURU)
  async getStatus(@Param('nis') nis: string) {
    return this.absensiService.getStatusHariIni(nis);
  }

  // =====================================================
  // GET RIWAYAT ABSENSI SISWA
  // Bisa dipanggil guru atau siswa itu sendiri
  // =====================================================
  @Get('riwayat/:nis')
  @Roles(UserRole.GURU, UserRole.SISWA)
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
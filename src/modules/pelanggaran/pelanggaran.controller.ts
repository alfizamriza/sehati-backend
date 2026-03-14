import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { PelanggaranService } from './pelanggaran.service';
import { CreatePelanggaranDto } from './dto/create-pelanggaran.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/pelanggaran')
@UseGuards(JwtAuthGuard)
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
    const nipGuru = req.user?.nip || req.user?.sub;
    return this.pelanggaranService.getRiwayatByGuru(nipGuru, limit ? parseInt(limit) : 100);
  }

  // POST /pelanggaran
  @Post()
  createPelanggaran(@Body() dto: CreatePelanggaranDto, @Request() req: any) {
    const nipGuru = req.user?.nip || req.user?.sub;
    return this.pelanggaranService.createPelanggaran(dto, nipGuru);
  }

  // PATCH /pelanggaran/:id/bukti
  @Patch(':id/bukti')
  updateBuktiFoto(
    @Param('id', ParseIntPipe) id: number,
    @Body('bukti_foto_url') buktiUrl: string,
    @Request() req: any,
  ) {
    const nipGuru = req.user?.nip || req.user?.sub;
    return this.pelanggaranService.updateBuktiFoto(id, buktiUrl, nipGuru);
  }

  // PATCH /pelanggaran/:id
  // Edit jenis pelanggaran & catatan — hanya jika status pending & milik guru sendiri
  @Patch(':id')
  updatePelanggaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { jenis_pelanggaran_id?: number; catatan?: string },
    @Request() req: any,
  ) {
    const nipGuru = req.user?.nip || req.user?.sub;
    return this.pelanggaranService.updatePelanggaran(id, body, nipGuru);
  }

  // DELETE /pelanggaran/:id
  // Hapus laporan — hanya jika status pending & milik guru sendiri
  @Delete(':id')
  deletePelanggaran(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const nipGuru = req.user?.nip || req.user?.sub;
    return this.pelanggaranService.deletePelanggaran(id, nipGuru);
  }
}
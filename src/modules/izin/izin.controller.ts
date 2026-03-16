import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IzinService } from './izin.service';
import { CreateIzinDto } from './dto/create-izin.dto';
import { CreateBatchIzinDto } from './dto/create-batch-izin.dto';
import { UpdateIzinStatusDto } from './dto/update-izin-status.dto';

@Controller('api/izin')
export class IzinController {
  constructor(private readonly izinService: IzinService) { }

  /** GET /izin/kelas — dropdown kelas untuk form */
  @Get('kelas')
  listKelas() {
    return this.izinService.listKelas();
  }

  /**
   * GET /izin/siswa-belum-absen?kelas_id=1&tanggal=2024-01-15
   * Mengembalikan siswa yang belum absen tumbler dan belum ada izin pada tanggal tsb
   */
  @Get('siswa-belum-absen')
  listSiswaBelumAbsen(
    @Query('kelas_id') kelasId: string,
    @Query('tanggal') tanggal: string,
  ) {
    if (!kelasId || !tanggal) {
      return [];
    }
    return this.izinService.listSiswaBelumAbsen(Number(kelasId), tanggal);
  }

  /** GET /izin — list semua izin */
  @Get()
  list(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.izinService.list({ status, from, to });
  }

  /** POST /izin — single create (langsung approved) */
  @Post()
  create(@Body() dto: CreateIzinDto) {
    return this.izinService.create(dto);
  }

  /** POST /izin/batch — batch create beberapa siswa sekaligus */
  @Post('batch')
  createBatch(@Body() dto: CreateBatchIzinDto) {
    return this.izinService.createBatch(dto);
  }

  /** PATCH /izin/:id — update status */
  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateIzinStatusDto) {
    return this.izinService.updateStatus(Number(id), dto);
  }
}
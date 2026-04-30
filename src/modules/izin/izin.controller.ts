import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IzinService } from './izin.service';
import { CreateIzinDto } from './dto/create-izin.dto';
import { CreateBatchIzinDto } from './dto/create-batch-izin.dto';
import { UpdateIzinStatusDto } from './dto/update-izin-status.dto';

@ApiTags('Izin')
@Controller('api/izin')
export class IzinController {
  constructor(private readonly izinService: IzinService) { }

  /** GET /izin/kelas — dropdown kelas untuk form */
  @Get('kelas')
  @ApiOperation({ summary: 'Get class list for permission form' })
  listKelas() {
    return this.izinService.listKelas();
  }

  /**
   * GET /izin/siswa-belum-absen?kelas_id=1&tanggal=2024-01-15
   * Mengembalikan siswa yang belum absen tumbler dan belum ada izin pada tanggal tsb
   */
  @Get('siswa-belum-absen')
  @ApiOperation({ summary: 'Get students who have not attended on selected date' })
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
  @ApiOperation({ summary: 'Get permission request list' })
  list(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.izinService.list({ status, from, to });
  }

  /** POST /izin — single create (langsung approved) */
  @Post()
  @ApiOperation({ summary: 'Create single permission request' })
  create(@Body() dto: CreateIzinDto) {
    return this.izinService.create(dto);
  }

  /** POST /izin/batch — batch create beberapa siswa sekaligus */
  @Post('batch')
  @ApiOperation({ summary: 'Create batch permission requests' })
  createBatch(@Body() dto: CreateBatchIzinDto) {
    return this.izinService.createBatch(dto);
  }

  /** PATCH /izin/:id — update status */
  @Patch(':id')
  @ApiOperation({ summary: 'Update permission request status by ID' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateIzinStatusDto) {
    return this.izinService.updateStatus(Number(id), dto);
  }
}

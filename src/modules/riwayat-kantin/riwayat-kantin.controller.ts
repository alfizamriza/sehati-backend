import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RiwayatKantinService, QueryRiwayatDto } from './riwayat-kantin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Riwayat Kantin')
@ApiBearerAuth('access-token')
@Controller('api/riwayat')
@UseGuards(JwtAuthGuard)
export class RiwayatKantinController {
  constructor(private riwayatService: RiwayatKantinService) {}

  /** GET /riwayat?period=today&page=1&limit=15&search=&paymentMethod= */
  @Get()
  @ApiOperation({ summary: 'Get canteen transaction history' })
  async getRiwayat(@Query() query: QueryRiwayatDto, @Request() req: any) {
    return this.riwayatService.getRiwayat(this.kantinId(req), query);
  }

  /** GET /riwayat/export — semua data tanpa paginasi + info sekolah */
  @Get('export')
  @ApiOperation({ summary: 'Export canteen transaction history dataset' })
  async getExport(@Query() query: QueryRiwayatDto, @Request() req: any) {
    return this.riwayatService.getForExport(this.kantinId(req), query);
  }

  /** GET /riwayat/info-sekolah — hanya data kop */
  @Get('info-sekolah')
  @ApiOperation({ summary: 'Get school information for export header' })
  async getInfoSekolah() {
    const data = await this.riwayatService.getInfoSekolah();
    return { success: true, data };
  }

  private kantinId(req: any): number {
    const u = req.user;
    return Number(u?.id ?? u?.sub ?? u?.kantinId ?? 0);
  }
}

import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { RiwayatKantinService, QueryRiwayatDto } from './riwayat-kantin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/riwayat')
@UseGuards(JwtAuthGuard)
export class RiwayatKantinController {
  constructor(private riwayatService: RiwayatKantinService) {}

  /** GET /riwayat?period=today&page=1&limit=15&search=&paymentMethod= */
  @Get()
  async getRiwayat(@Query() query: QueryRiwayatDto, @Request() req: any) {
    return this.riwayatService.getRiwayat(this.kantinId(req), query);
  }

  /** GET /riwayat/export — semua data tanpa paginasi + info sekolah */
  @Get('export')
  async getExport(@Query() query: QueryRiwayatDto, @Request() req: any) {
    return this.riwayatService.getForExport(this.kantinId(req), query);
  }

  /** GET /riwayat/info-sekolah — hanya data kop */
  @Get('info-sekolah')
  async getInfoSekolah() {
    const data = await this.riwayatService.getInfoSekolah();
    return { success: true, data };
  }

  private kantinId(req: any): number {
    const u = req.user;
    return Number(u?.id ?? u?.sub ?? u?.kantinId ?? 0);
  }
}

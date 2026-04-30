import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransaksiService } from './transaksi.service';
import { CreateTransaksiDto } from './dto/transaksi.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Transaksi')
@ApiBearerAuth('access-token')
@Controller('api/transaksi')
@UseGuards(JwtAuthGuard)
export class TransaksiController {
  constructor(private transaksiService: TransaksiService) { }

  @Get('siswa/list')
  @ApiOperation({ summary: 'Get student list for transaction form' })
  async listSiswa() {
    const data = await this.transaksiService.listSiswa();
    return { success: true, data };
  }

  /** GET /transaksi/siswa?nis=1234567
   *  Dipanggil setelah scan QR atau input manual
   *  Mengembalikan info siswa + voucher aktif miliknya
   */
  @Get('siswa')
  @ApiOperation({ summary: 'Lookup student detail by NIS for transaction' })
  async lookupSiswa(@Query('nis') nis: string) {
    if (!nis) throw new Error('NIS wajib diisi');
    const data = await this.transaksiService.lookupSiswa(nis);
    return { success: true, data };
  }

  @Get('guru/list')
  @ApiOperation({ summary: 'Get teacher list for transaction form' })
  async listGuru() {
    const data = await this.transaksiService.listGuru();
    return { success: true, data };
  }

  @Get('guru')
  @ApiOperation({ summary: 'Lookup teacher detail by NIP for transaction' })
  async lookupGuru(@Query('nip') nip: string) {
    if (!nip) throw new Error('NIP wajib diisi');
    const data = await this.transaksiService.lookupGuru(nip);
    return { success: true, data };
  }

  /** GET /transaksi/voucher?kode=HEMAT5K&nis=1234567
   *  Validasi kode voucher yang diketik manual
   */
  @Get('voucher')
  @ApiOperation({ summary: 'Validate voucher code for transaction' })
  async cekVoucher(
    @Query('kode') kode: string,
    @Query('nis') nis: string,
  ) {
    const data = await this.transaksiService.cekVoucher({ kodeVoucher: kode, nis });
    return { success: true, data };
  }

  /** GET /transaksi/produk
   *  Katalog produk aktif yang tersedia (stok > 0)
   */
  @Get('produk')
  @ApiOperation({ summary: 'Get active product catalog for transaction' })
  async getProduk(@Request() req: any) {
    const kantinId = this.extractKantinId(req.user);
    const data = await this.transaksiService.getProdukKatalog(kantinId);
    return { success: true, data };
  }

  /** POST /transaksi
   *  Buat transaksi baru, update stok, coins, dan voucher
   */
  @Post()
  @ApiOperation({ summary: 'Create new canteen transaction' })
  async createTransaksi(
    @Body() dto: CreateTransaksiDto,
    @Request() req: any,
  ) {
    const kantinId = this.extractKantinId(req.user);
    const data = await this.transaksiService.createTransaksi(dto, kantinId);
    return { success: true, data };
  }

  @Get('kasbon')
  @ApiOperation({ summary: 'Get outstanding credit transactions' })
  async getDaftarKasbon(@Request() req: any) {
    const kantinId = this.extractKantinId(req.user);
    const data = await this.transaksiService.getDaftarKasbon(kantinId);
    return { success: true, data };
  }

  @Post('kasbon/:id/bayar')
  @ApiOperation({ summary: 'Pay credit transaction by ID' })
  async lunasiKasbon(
    @Request() req: any,
    @Body('nominalBayar') nominalBayar: number,
  ) {
    const kantinId = this.extractKantinId(req.user);
    const transaksiId = Number(req.params.id);
    if (isNaN(transaksiId)) throw new Error('ID Transaksi tidak valid');
    const data = await this.transaksiService.lunasiKasbon(kantinId, transaksiId, nominalBayar);
    return { success: true, data };
  }

  private extractKantinId(user: any): number {
    if (!user) throw new Error('User tidak ditemukan');
    const raw = user.id ?? user.sub ?? user.kantinId ?? null;
    if (!raw) throw new Error('Kantin ID tidak ditemukan di token');
    return Number(raw);
  }


}

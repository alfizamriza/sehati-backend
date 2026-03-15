import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { TransaksiService } from './transaksi.service';
import { CreateTransaksiDto, LookupSiswaDto, CekVoucherDto } from './dto/transaksi.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/transaksi')
@UseGuards(JwtAuthGuard)
export class TransaksiController {
  constructor(private transaksiService: TransaksiService) { }

  @Get('siswa/list')
  async listSiswa() {
    const data = await this.transaksiService.listSiswa();
    return { success: true, data };
  }

  /** GET /transaksi/siswa?nis=1234567
   *  Dipanggil setelah scan QR atau input manual
   *  Mengembalikan info siswa + voucher aktif miliknya
   */
  @Get('siswa')
  async lookupSiswa(@Query('nis') nis: string) {
    if (!nis) throw new Error('NIS wajib diisi');
    const data = await this.transaksiService.lookupSiswa(nis);
    return { success: true, data };
  }

  /** GET /transaksi/voucher?kode=HEMAT5K&nis=1234567
   *  Validasi kode voucher yang diketik manual
   */
  @Get('voucher')
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
  async getProduk(@Request() req: any) {
    const kantinId = this.extractKantinId(req.user);
    const data = await this.transaksiService.getProdukKatalog(kantinId);
    return { success: true, data };
  }

  /** POST /transaksi
   *  Buat transaksi baru, update stok, coins, dan voucher
   */
  @Post()
  async createTransaksi(
    @Body() dto: CreateTransaksiDto,
    @Request() req: any,
  ) {
    const kantinId = this.extractKantinId(req.user);
    const data = await this.transaksiService.createTransaksi(dto, kantinId);
    return { success: true, data };
  }

  private extractKantinId(user: any): number {
    if (!user) throw new Error('User tidak ditemukan');
    const raw = user.id ?? user.sub ?? user.kantinId ?? null;
    if (!raw) throw new Error('Kantin ID tidak ditemukan di token');
    return Number(raw);
  }


}
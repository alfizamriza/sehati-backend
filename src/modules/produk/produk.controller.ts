import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ProdukService } from './produk.service';
import {
  CreateProdukDto, UpdateProdukDto, QueryProdukDto, ResetStokHarianDto,
} from './dto/produk.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/produk')
@UseGuards(JwtAuthGuard)
export class ProdukController {
  constructor(private produkService: ProdukService) {}

  /** GET /produk  — semua produk milik kantin (bisa filter: ?kategori=&search=&isActive=&isTitipan=) */
  @Get()
  async getAll(@Request() req: any, @Query() query: QueryProdukDto) {
    const id   = this.kantinId(req);
    const data = await this.produkService.getAllProduk(id, query);
    return { success: true, data };
  }

  /** GET /produk/stats */
  @Get('stats')
  async getStats(@Request() req: any) {
    const data = await this.produkService.getStats(this.kantinId(req));
    return { success: true, data };
  }

  /** GET /produk/kategori */
  @Get('kategori')
  async getKategori(@Request() req: any) {
    const data = await this.produkService.getKategori(this.kantinId(req));
    return { success: true, data };
  }

  /** GET /produk/:id */
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.produkService.getOneProduk(this.kantinId(req), id);
    return { success: true, data };
  }

  /** POST /produk */
  @Post()
  async create(@Body() dto: CreateProdukDto, @Request() req: any) {
    const data = await this.produkService.createProduk(this.kantinId(req), dto);
    return { success: true, data };
  }

  /** PATCH /produk/:id */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProdukDto,
    @Request() req: any,
  ) {
    const data = await this.produkService.updateProduk(this.kantinId(req), id, dto);
    return { success: true, data };
  }

  /** PATCH /produk/:id/stok  — update stok saja { stok: number } */
  @Patch(':id/stok')
  async patchStok(
    @Param('id', ParseIntPipe) id: number,
    @Body('stok') stok: number,
    @Request() req: any,
  ) {
    const data = await this.produkService.patchStok(this.kantinId(req), id, stok);
    return { success: true, data };
  }

  /** PATCH /produk/:id/reset-harian  — reset stok titipan harian { stokHarian: number } */
  @Patch(':id/reset-harian')
  async resetHarian(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetStokHarianDto,
    @Request() req: any,
  ) {
    const data = await this.produkService.resetStokHarian(this.kantinId(req), id, dto);
    return { success: true, data };
  }

  /** DELETE /produk/:id  — soft delete */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.produkService.deleteProduk(this.kantinId(req), id);
    return { success: true, message: 'Produk berhasil dinonaktifkan' };
  }

  private kantinId(req: any): number {
    const u = req.user;
    const raw = u?.id ?? u?.sub ?? u?.kantinId ?? null;
    if (!raw) throw new Error('Kantin ID tidak ditemukan di token');
    return Number(raw);
  }
}
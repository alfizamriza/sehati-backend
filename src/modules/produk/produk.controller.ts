import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProdukService } from './produk.service';
import {
  CreateProdukDto, UpdateProdukDto, QueryProdukDto, ResetStokHarianDto,
} from './dto/produk.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Produk')
@ApiBearerAuth('access-token')
@Controller('api/produk')
@UseGuards(JwtAuthGuard)
export class ProdukController {
  constructor(private produkService: ProdukService) {}

  /** GET /produk  — semua produk milik kantin (bisa filter: ?kategori=&search=&isActive=&isTitipan=) */
  @Get()
  @ApiOperation({ summary: 'Get all products for current canteen' })
  async getAll(@Request() req: any, @Query() query: QueryProdukDto) {
    const id   = this.kantinId(req);
    const data = await this.produkService.getAllProduk(id, query);
    return { success: true, data };
  }

  /** GET /produk/stats */
  @Get('stats')
  @ApiOperation({ summary: 'Get product statistics' })
  async getStats(@Request() req: any) {
    const data = await this.produkService.getStats(this.kantinId(req));
    return { success: true, data };
  }

  /** GET /produk/kategori */
  @Get('kategori')
  @ApiOperation({ summary: 'Get product categories' })
  async getKategori(@Request() req: any) {
    const data = await this.produkService.getKategori(this.kantinId(req));
    return { success: true, data };
  }

  /** GET /produk/:id */
  @Get(':id')
  @ApiOperation({ summary: 'Get product detail by ID' })
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.produkService.getOneProduk(this.kantinId(req), id);
    return { success: true, data };
  }

  /** POST /produk */
  @Post()
  @ApiOperation({ summary: 'Create new product' })
  async create(@Body() dto: CreateProdukDto, @Request() req: any) {
    const data = await this.produkService.createProduk(this.kantinId(req), dto);
    return { success: true, data };
  }

  /** PATCH /produk/:id */
  @Patch(':id')
  @ApiOperation({ summary: 'Update product by ID' })
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
  @ApiOperation({ summary: 'Update product stock only' })
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
  @ApiOperation({ summary: 'Reset daily stock for consignment product' })
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
  @ApiOperation({ summary: 'Deactivate product by ID' })
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

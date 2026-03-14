// pengaturan.controller.ts
import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PengaturanService } from './pengaturan.service';
import { Public } from 'src/common/decorators/public.decorator';

import { UpdatePengaturanDto } from './dto/update-pengaturan.dto';
import { BulkUpdatePengaturanDto } from './dto/bulk-update-pengaturan.dto';
import { CreateTanggalLiburDto } from './dto/create-tanggal-libur.dto';
import { UpdateTanggalLiburDto } from './dto/update-tanggal-libur.dto';
import { CreateJenisPelanggaranDto } from './dto/create-jenis-pelanggaran.dto';
import { UpdateJenisPelanggaranDto } from './dto/update-jenis-pelanggaran.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@Controller('api/pengaturan')
export class PengaturanController {
  constructor(private readonly svc: PengaturanService) {}

  // ===========================
  //  PENGATURAN (key-value)
  // ===========================

  @Public()
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Public()
  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.svc.findByKey(key);
  }

  @Patch(':key')
  updateOne(@Param('key') key: string, @Body() dto: UpdatePengaturanDto) {
    return this.svc.updateByKey(key, dto.value);
  }

  @Patch()
  bulkUpdate(@Body() dto: BulkUpdatePengaturanDto) {
    return this.svc.bulkUpdate(dto.items);
  }

  // ===========================
  //  TANGGAL LIBUR
  // ===========================

  @Get('libur/list')
  findAllLibur() {
    return this.svc.findAllLibur();
  }

  @Post('libur')
  createLibur(@Body() dto: CreateTanggalLiburDto) {
    return this.svc.createLibur(dto);
  }

  @Patch('libur/:id')
  updateLibur(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTanggalLiburDto,
  ) {
    return this.svc.updateLibur(id, dto);
  }

  @Patch('libur/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleLibur(@Param('id', ParseIntPipe) id: number) {
    return this.svc.toggleLiburActive(id);
  }

  @Delete('libur/:id')
  deleteLibur(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteLibur(id);
  }

  // ===========================
  //  JENIS PELANGGARAN
  // ===========================

  @Get('pelanggaran/list')
  findAllPelanggaran(@Query('kategori') kategori?: string) {
    return this.svc.findAllPelanggaran(kategori);
  }

  @Post('pelanggaran')
  createPelanggaran(@Body() dto: CreateJenisPelanggaranDto) {
    return this.svc.createPelanggaran(dto);
  }

  @Patch('pelanggaran/:id')
  updatePelanggaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJenisPelanggaranDto,
  ) {
    return this.svc.updatePelanggaran(id, dto);
  }

  @Patch('pelanggaran/:id/toggle')
  @HttpCode(HttpStatus.OK)
  togglePelanggaran(@Param('id', ParseIntPipe) id: number) {
    return this.svc.togglePelanggaranActive(id);
  }

  @Delete('pelanggaran/:id')
  deletePelanggaran(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deletePelanggaran(id);
  }

  // ===========================
  //  ACHIEVEMENT
  // ===========================

  /** GET /pengaturan/achievement/list?tipe=streak */
  @Get('achievement/list')
  findAllAchievement(@Query('tipe') tipe?: string) {
    return this.svc.findAllAchievement(tipe);
  }

  /** POST /pengaturan/achievement */
  @Post('achievement')
  createAchievement(@Body() dto: CreateAchievementDto) {
    return this.svc.createAchievement(dto);
  }

  /** PATCH /pengaturan/achievement/:id */
  @Patch('achievement/:id')
  updateAchievement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.svc.updateAchievement(id, dto);
  }

  /** PATCH /pengaturan/achievement/:id/toggle → toggle is_active */
  @Patch('achievement/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleAchievement(@Param('id', ParseIntPipe) id: number) {
    return this.svc.toggleAchievementActive(id);
  }

  /** DELETE /pengaturan/achievement/:id */
  @Delete('achievement/:id')
  deleteAchievement(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteAchievement(id);
  }
}

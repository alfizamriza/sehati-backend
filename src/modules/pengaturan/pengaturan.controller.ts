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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Pengaturan')
@Controller('api/pengaturan')
export class PengaturanController {
  constructor(private readonly svc: PengaturanService) {}

  // ===========================
  //  PENGATURAN (key-value)
  // ===========================

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all application settings' })
  findAll() {
    return this.svc.findAll();
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'Get setting value by key' })
  findOne(@Param('key') key: string) {
    return this.svc.findByKey(key);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update single setting by key' })
  updateOne(@Param('key') key: string, @Body() dto: UpdatePengaturanDto) {
    return this.svc.updateByKey(key, dto.value);
  }

  @Patch()
  @ApiOperation({ summary: 'Bulk update multiple settings' })
  bulkUpdate(@Body() dto: BulkUpdatePengaturanDto) {
    return this.svc.bulkUpdate(dto.items);
  }

  // ===========================
  //  TANGGAL LIBUR
  // ===========================

  @Get('libur/list')
  @ApiOperation({ summary: 'Get holiday date list' })
  findAllLibur() {
    return this.svc.findAllLibur();
  }

  @Post('libur')
  @ApiOperation({ summary: 'Create holiday date' })
  createLibur(@Body() dto: CreateTanggalLiburDto) {
    return this.svc.createLibur(dto);
  }

  @Patch('libur/:id')
  @ApiOperation({ summary: 'Update holiday date by ID' })
  updateLibur(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTanggalLiburDto,
  ) {
    return this.svc.updateLibur(id, dto);
  }

  @Patch('libur/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle holiday active status' })
  toggleLibur(@Param('id', ParseIntPipe) id: number) {
    return this.svc.toggleLiburActive(id);
  }

  @Delete('libur/:id')
  @ApiOperation({ summary: 'Delete holiday date by ID' })
  deleteLibur(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteLibur(id);
  }

  // ===========================
  //  JENIS PELANGGARAN
  // ===========================

  @Get('pelanggaran/list')
  @ApiOperation({ summary: 'Get violation types list' })
  findAllPelanggaran(@Query('kategori') kategori?: string) {
    return this.svc.findAllPelanggaran(kategori);
  }

  @Post('pelanggaran')
  @ApiOperation({ summary: 'Create violation type' })
  createPelanggaran(@Body() dto: CreateJenisPelanggaranDto) {
    return this.svc.createPelanggaran(dto);
  }

  @Patch('pelanggaran/:id')
  @ApiOperation({ summary: 'Update violation type by ID' })
  updatePelanggaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJenisPelanggaranDto,
  ) {
    return this.svc.updatePelanggaran(id, dto);
  }

  @Patch('pelanggaran/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle violation type active status' })
  togglePelanggaran(@Param('id', ParseIntPipe) id: number) {
    return this.svc.togglePelanggaranActive(id);
  }

  @Delete('pelanggaran/:id')
  @ApiOperation({ summary: 'Delete violation type by ID' })
  deletePelanggaran(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deletePelanggaran(id);
  }

  // ===========================
  //  ACHIEVEMENT
  // ===========================

  /** GET /pengaturan/achievement/list?tipe=streak */
  @Get('achievement/list')
  @ApiOperation({ summary: 'Get achievement configuration list' })
  findAllAchievement(@Query('tipe') tipe?: string) {
    return this.svc.findAllAchievement(tipe);
  }

  /** POST /pengaturan/achievement */
  @Post('achievement')
  @ApiOperation({ summary: 'Create achievement configuration' })
  createAchievement(@Body() dto: CreateAchievementDto) {
    return this.svc.createAchievement(dto);
  }

  /** PATCH /pengaturan/achievement/:id */
  @Patch('achievement/:id')
  @ApiOperation({ summary: 'Update achievement configuration by ID' })
  updateAchievement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.svc.updateAchievement(id, dto);
  }

  /** PATCH /pengaturan/achievement/:id/toggle → toggle is_active */
  @Patch('achievement/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle achievement active status' })
  toggleAchievement(@Param('id', ParseIntPipe) id: number) {
    return this.svc.toggleAchievementActive(id);
  }

  /** DELETE /pengaturan/achievement/:id */
  @Delete('achievement/:id')
  @ApiOperation({ summary: 'Delete achievement configuration by ID' })
  deleteAchievement(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deleteAchievement(id);
  }
}

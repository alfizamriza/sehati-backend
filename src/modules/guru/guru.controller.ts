import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { GuruService } from './guru.service';
import { CreateGuruDto } from './dto/create-guru.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';
import type { UpdateGuruPasswordDto } from './dto/update-guru-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/guru')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GuruController {
  constructor(private guruService: GuruService) {}

  // ⚠️ PENTING: Route statis di atas route dinamis (:nip)

  // GET /api/guru/kelas-tersedia
  @Get('kelas-tersedia')
  async getKelasTersedia(@Query('excludeKelasWaliId') excludeId?: string) {
    return this.guruService.getKelasTersedia(excludeId ? Number(excludeId) : undefined);
  }

  // GET /api/guru
  @Get()
  async findAll() {
    return this.guruService.findAll();
  }

  // GET /api/guru/:nip
  @Get(':nip')
  async findOne(@Param('nip') nip: string) {
    return this.guruService.findOne(nip);
  }

  // POST /api/guru
  @Post()
  async create(@Body() dto: CreateGuruDto) {
    return this.guruService.create(dto);
  }

  // PUT /api/guru/:nip
  @Put(':nip')
  async update(@Param('nip') nip: string, @Body() dto: UpdateGuruDto) {
    return this.guruService.update(nip, dto);
  }

  // DELETE /api/guru/:nip
  @Delete(':nip')
  async remove(@Param('nip') nip: string) {
    return this.guruService.remove(nip);
  }

  @Patch('password')
  @Roles(UserRole.GURU)
  async updatePassword(@Req() req: any, @Body() dto: UpdateGuruPasswordDto) {
    return this.guruService.updatePassword(req.user.sub, dto);
  }
}

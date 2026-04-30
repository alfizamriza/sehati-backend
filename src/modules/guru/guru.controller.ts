import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GuruService } from './guru.service';
import { CreateGuruDto } from './dto/create-guru.dto';
import { UpdateGuruDto } from './dto/update-guru.dto';
import type { UpdateGuruPasswordDto } from './dto/update-guru-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Guru')
@ApiBearerAuth('access-token')
@Controller('api/guru')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GuruController {
  constructor(private guruService: GuruService) {}

  // ⚠️ PENTING: Route statis di atas route dinamis (:nip)

  // GET /api/guru/kelas-tersedia
  @Get('kelas-tersedia')
  @ApiOperation({ summary: 'Get available classes for teacher assignment' })
  async getKelasTersedia(@Query('excludeKelasWaliId') excludeId?: string) {
    return this.guruService.getKelasTersedia(excludeId ? Number(excludeId) : undefined);
  }

  // GET /api/guru
  @Get()
  @ApiOperation({ summary: 'Get all teachers' })
  async findAll() {
    return this.guruService.findAll();
  }

  // GET /api/guru/:nip
  @Get(':nip')
  @ApiOperation({ summary: 'Get teacher detail by NIP' })
  async findOne(@Param('nip') nip: string) {
    return this.guruService.findOne(nip);
  }

  // POST /api/guru
  @Post()
  @ApiOperation({ summary: 'Create new teacher data' })
  async create(@Body() dto: CreateGuruDto) {
    return this.guruService.create(dto);
  }

  // PUT /api/guru/:nip
  @Put(':nip')
  @ApiOperation({ summary: 'Update teacher data by NIP' })
  async update(@Param('nip') nip: string, @Body() dto: UpdateGuruDto) {
    return this.guruService.update(nip, dto);
  }

  // DELETE /api/guru/:nip
  @Delete(':nip')
  @ApiOperation({ summary: 'Delete teacher data by NIP' })
  async remove(@Param('nip') nip: string) {
    return this.guruService.remove(nip);
  }

  @Patch('password')
  @Roles(UserRole.GURU)
  @ApiOperation({ summary: 'Update teacher account password' })
  async updatePassword(@Req() req: any, @Body() dto: UpdateGuruPasswordDto) {
    return this.guruService.updatePassword(req.user.sub, dto);
  }
}

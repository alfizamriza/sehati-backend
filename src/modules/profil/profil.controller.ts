import {
  Controller, Get, Patch, Post, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfilService } from './profil.service';
import type { UpdateFotoDto, UpdatePasswordDto } from './profil.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Profil')
@ApiBearerAuth('access-token')
@Controller('api/profil')
@UseGuards(JwtAuthGuard)
export class ProfilController {
  constructor(private profilService: ProfilService) {}

  /** GET /profil — data lengkap + achievements */
  @Get()
  @ApiOperation({ summary: 'Get current student profile' })
  async getProfil(@Request() req: any) {
    const nis = this.extractNis(req.user);
    return { success: true, message: 'Profil berhasil diambil', data: await this.profilService.getProfil(nis) };
  }

  /** PATCH /profil/foto — update URL foto setelah upload */
  @Patch('foto')
  @ApiOperation({ summary: 'Update profile photo URL' })
  async updateFoto(@Request() req: any, @Body() body: UpdateFotoDto) {
    const nis = this.extractNis(req.user);
    const result = await this.profilService.updateFoto(nis, body);
    return { success: true, message: 'Foto profil berhasil diupdate', data: result };
  }

  /** PATCH /profil/password — ganti password */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update student password' })
  async updatePassword(@Request() req: any, @Body() body: UpdatePasswordDto) {
    const nis = this.extractNis(req.user);
    await this.profilService.updatePassword(nis, body);
    return { success: true, message: 'Password berhasil diubah' };
  }

  /** GET /profil/upload-url?mime=image/jpeg — signed URL untuk upload foto */
  @Get('upload-url')
  @ApiOperation({ summary: 'Generate signed upload URL for profile photo' })
  async getUploadUrl(@Request() req: any, @Query('mime') mime: string) {
    const nis = this.extractNis(req.user);
    const mimeType = mime || 'image/jpeg';
    const result = await this.profilService.getUploadUrl(nis, mimeType);
    return { success: true, message: 'Signed upload URL berhasil dibuat', data: result };
  }

  private extractNis(user: any): string {
    if (!user) throw new Error('User tidak ditemukan di token');
    const raw = user.nis ?? user.sub ?? user.id ?? user.username ?? null;
    if (!raw) throw new Error('NIS tidak ditemukan di token');
    return String(raw).trim();
  }
}

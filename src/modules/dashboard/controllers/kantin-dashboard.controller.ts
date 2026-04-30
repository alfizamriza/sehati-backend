import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KantinDashboardService } from '../services/kantin-dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Kantin Dashboard')
@ApiBearerAuth('access-token')
@Controller('api/kantin/dashboard')
@UseGuards(JwtAuthGuard)
export class KantinDashboardController {
  constructor(private kantinDashboardService: KantinDashboardService) {}

  /** GET /dashboard/kantin */
  @Get()
  @ApiOperation({ summary: 'Get canteen dashboard summary' })
  async getDashboard(@Request() req: any) {
    // JWT kantin menyimpan id di salah satu field berikut
    const kantinId = this.extractKantinId(req.user);
    const data = await this.kantinDashboardService.getDashboard(kantinId);
    return { success: true, data };
  }

  private extractKantinId(user: any): number {
    if (!user) throw new Error('User tidak ditemukan di token');
    const raw = user.id ?? user.sub ?? user.kantinId ?? user.username ?? null;
    if (!raw) throw new Error('Kantin ID tidak ditemukan di token');
    return Number(raw);
  }
}

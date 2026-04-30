import {
  Controller,
  Get,
  UseGuards,
  Req,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiswaDashboardService } from '../services/siswa-dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Siswa Dashboard')
@ApiBearerAuth('access-token')
@Controller('api/dashboard/siswa')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SISWA)
export class SiswaDashboardController {
  constructor(private siswaDashboardService: SiswaDashboardService) {}

  /**
   * GET /api/dashboard/siswa
   * Dashboard overview untuk siswa
   */
  @Get()
  @ApiOperation({ summary: 'Get student dashboard overview' })
  async getDashboard(
    @Req() req: any,
    @Query('mode') mode: 'month' = 'month',
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const nis = req.user.sub;
    const parsedYear = year ? Number(year) : undefined;
    const parsedMonth = month ? Number(month) : undefined;
    return this.siswaDashboardService.getDashboard(nis, mode, parsedYear, parsedMonth);
  }
  
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('access-token')
@Controller('api/admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  async getDashboard() {
    return this.adminDashboardService.getDashboardData();
  }
}

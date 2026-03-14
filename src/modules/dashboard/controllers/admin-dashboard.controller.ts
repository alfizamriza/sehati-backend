import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  @Get()
  async getDashboard() {
    return this.adminDashboardService.getDashboardData();
  }
}
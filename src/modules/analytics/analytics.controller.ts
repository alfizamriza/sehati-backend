import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import * as analyticsService_1 from './analytics.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: analyticsService_1.AnalyticsService) {}

  /**
   * GET /analytics
   * ?period=today|week|month|year|custom
   * &startDate=YYYY-MM-DD   (hanya saat period=custom)
   * &endDate=YYYY-MM-DD
   */
  @Get()
  async getAnalytics(
    @Query('period')    period: analyticsService_1.AnalyticsPeriod = 'today',
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?: string,
  ) {
    const data = await this.analyticsService.getAnalytics(period, startDate, endDate);
    return { success: true, data };
  }
}
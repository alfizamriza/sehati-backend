import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AchievementService } from './achievement.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import type { UpsertShowcaseNoteDto } from './dto/upsert-showcase-note.dto';

@ApiTags('Achievement')
@ApiBearerAuth('access-token')
@Controller('api/achievement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SISWA)
export class AchievementController {
  constructor(private achievementService: AchievementService) {}

  @Get('undisplayed')
  @ApiOperation({ summary: 'Get undisplayed achievements for current student' })
  async getUndisplayed(@Req() req: any) {
    return this.achievementService.getUndisplayedAchievements(req.user.sub);
  }

  @Post('mark-displayed')
  @ApiOperation({ summary: 'Mark achievements as already displayed' })
  async markDisplayed(@Body() body: { achievementIds: number[] }) {
    await this.achievementService.markAsDisplayed(body.achievementIds);
    return { success: true, message: 'Achievement marked as displayed' };
  }

  @Get('unlocked')
  @ApiOperation({ summary: 'Get unlocked achievements for current student' })
  async getUnlocked(@Req() req: any) {
    return this.achievementService.getUnlockedAchievements(req.user.sub);
  }

  @Get('showcase-options')
  @ApiOperation({ summary: 'Get available achievement showcase options' })
  async getShowcaseOptions(@Req() req: any) {
    return this.achievementService.getShowcaseOptions(req.user.sub);
  }

  @Get('showcase-note')
  @ApiOperation({ summary: 'Get active showcase note for current student' })
  async getShowcaseNote(@Req() req: any) {
    return this.achievementService.getActiveShowcaseNote(req.user.sub);
  }

  @Post('showcase-note')
  @ApiOperation({ summary: 'Create or update showcase note' })
  async upsertShowcaseNote(
    @Req() req: any,
    @Body() body: UpsertShowcaseNoteDto,
  ) {
    return this.achievementService.upsertShowcaseNote(req.user.sub, body);
  }

  @Delete('showcase-note')
  @ApiOperation({ summary: 'Delete active showcase note' })
  async deleteShowcaseNote(@Req() req: any) {
    return this.achievementService.removeShowcaseNote(req.user.sub);
  }
}

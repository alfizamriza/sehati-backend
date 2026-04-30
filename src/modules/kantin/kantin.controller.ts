import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, UseGuards, ParseIntPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KantinService } from './kantin.service';
import { CreateKantinDto } from './dto/create-kantin.dto';
import { UpdateKantinDto } from './dto/update-kantin.dto';
import type { UpdateKantinPasswordDto } from './dto/update-kantin-password.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Kantin')
@ApiBearerAuth('access-token')
@Controller('api/kantin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class KantinController {
  constructor(private kantinService: KantinService) {}

  @Get()
  @ApiOperation({ summary: 'Get all canteen accounts' })
  async findAll() {
    return this.kantinService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get canteen detail by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kantinService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new canteen account' })
  async create(@Body() dto: CreateKantinDto) {
    return this.kantinService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update canteen data by ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKantinDto) {
    return this.kantinService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete canteen data by ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.kantinService.remove(id);
  }

  @Patch('password')
  @Roles(UserRole.KANTIN)
  @ApiOperation({ summary: 'Update canteen account password' })
  async updatePassword(@Req() req: any, @Body() dto: UpdateKantinPasswordDto) {
    return this.kantinService.updatePassword(Number(req.user.sub), dto);
  }
}

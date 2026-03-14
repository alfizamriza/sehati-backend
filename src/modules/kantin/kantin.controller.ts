import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { KantinService } from './kantin.service';
import { CreateKantinDto } from './dto/create-kantin.dto';
import { UpdateKantinDto } from './dto/update-kantin.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/kantin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class KantinController {
  constructor(private kantinService: KantinService) {}

  @Get()
  async findAll() {
    return this.kantinService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kantinService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateKantinDto) {
    return this.kantinService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKantinDto) {
    return this.kantinService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.kantinService.remove(id);
  }
}
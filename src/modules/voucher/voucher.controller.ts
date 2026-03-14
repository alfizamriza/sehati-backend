import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, ParseIntPipe, Req,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/voucher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class VoucherController {
  constructor(private voucherService: VoucherService) {}

  // ⚠️ Route statis di atas route dinamis
  @Get('siswa-dropdown')
  async getSiswaDropdown() {
    return this.voucherService.getSiswaDropdown();
  }

  @Get()
  async findAll() {
    return this.voucherService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateVoucherDto, @Req() req: any) {
    const createdBy = req.user?.sub; // ID dari JWT payload
    return this.voucherService.create(dto, createdBy);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.voucherService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.remove(id);
  }
}
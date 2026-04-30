import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, ParseIntPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Voucher')
@ApiBearerAuth('access-token')
@Controller('api/voucher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class VoucherController {
  constructor(private voucherService: VoucherService) {}

  // ⚠️ Route statis di atas route dinamis
  @Get('siswa-dropdown')
  @ApiOperation({ summary: 'Get student dropdown options for voucher assignment' })
  async getSiswaDropdown() {
    return this.voucherService.getSiswaDropdown();
  }

  @Get()
  @ApiOperation({ summary: 'Get all vouchers' })
  async findAll() {
    return this.voucherService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voucher detail by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new voucher' })
  async create(@Body() dto: CreateVoucherDto, @Req() req: any) {
    const createdBy = req.user?.sub; // ID dari JWT payload
    return this.voucherService.create(dto, createdBy);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update voucher by ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.voucherService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete voucher by ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.voucherService.remove(id);
  }
}

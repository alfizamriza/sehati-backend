import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KelasService } from './kelas.service';
import { CreateKelasDto } from './dto/create-kelas.dto';
import { UpdateKelasDto } from './dto/update-kelas.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('Kelas')
@ApiBearerAuth('access-token')
@Controller('api/kelas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KelasController {
  constructor(private kelasService: KelasService) {}

  // GET /api/kelas - Get all kelas
  @Get()
  @Roles(UserRole.ADMIN, UserRole.GURU)
  @ApiOperation({ summary: 'Get all classes' })
  async findAll() {
    return this.kelasService.findAll();
  }

  // GET /api/kelas/:id - Get kelas by ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GURU)
  @ApiOperation({ summary: 'Get class detail by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kelasService.findOne(id);
  }

  // POST /api/kelas - Create kelas
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new class data' })
  async create(@Body() createKelasDto: CreateKelasDto) {
    return this.kelasService.create(createKelasDto);
  }

  // PUT /api/kelas/:id - Update kelas
  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update class data by ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKelasDto: UpdateKelasDto,
  ) {
    return this.kelasService.update(id, updateKelasDto);
  }

  // DELETE /api/kelas/:id - Delete kelas
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete class data by ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.kelasService.remove(id);
  }
}

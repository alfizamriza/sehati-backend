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
import { KelasService } from './kelas.service';
import { CreateKelasDto } from './dto/create-kelas.dto';
import { UpdateKelasDto } from './dto/update-kelas.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('api/kelas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KelasController {
  constructor(private kelasService: KelasService) {}

  // GET /api/kelas - Get all kelas
  @Get()
  @Roles(UserRole.ADMIN, UserRole.GURU)
  async findAll() {
    return this.kelasService.findAll();
  }

  // GET /api/kelas/:id - Get kelas by ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GURU)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kelasService.findOne(id);
  }

  // POST /api/kelas - Create kelas
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createKelasDto: CreateKelasDto) {
    return this.kelasService.create(createKelasDto);
  }

  // PUT /api/kelas/:id - Update kelas
  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKelasDto: UpdateKelasDto,
  ) {
    return this.kelasService.update(id, updateKelasDto);
  }

  // DELETE /api/kelas/:id - Delete kelas
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.kelasService.remove(id);
  }
}
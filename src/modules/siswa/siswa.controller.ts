import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SiswaService } from './siswa.service';
import { CreateSiswaDto } from './dto/create-siswa.dto';
import { UpdateSiswaDto } from './dto/update-siswa.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Multer } from 'multer';



type UploadedExcelFile = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
};

@ApiTags('Siswa')
@ApiBearerAuth('access-token')
@Controller('api/siswa')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SiswaController {
  constructor(private siswaService: SiswaService) {}

 // ⚠️ PENTING: TEMPLATE HARUS DI ATAS SEMUA ROUTE!
  @Get('import-template')
  @ApiOperation({ summary: 'Download student import template file' })
  async getTemplate(@Res() res: Response) {
    const template = await this.siswaService.generateImportTemplate();
    
    res.setHeader('Content-Type', template.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${template.filename}"`,
    );
    res.send(template.buffer);
  }

  // ⚠️ HARUS DI ATAS @Get(':nis')
  @Post('import')
  @ApiOperation({ summary: 'Import students from Excel or CSV file' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async importExcel(@UploadedFile() file: Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel.sheet.macroEnabled.12', // xlsm
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12', // xlsb
      'text/csv',
      'application/csv',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format file tidak didukung: ${file.mimetype}. Gunakan xlsx atau csv`,
      );
    }

    return this.siswaService.importExcel(file);
  }

  // GET /api/siswa - Get all siswa
  @Get()
  @ApiOperation({ summary: 'Get all students' })
  async findAll() {
    return this.siswaService.findAll();
  }

  // GET /api/siswa/:nis - Get siswa by NIS
  @Get(':nis')
  @ApiOperation({ summary: 'Get student detail by NIS' })
  async findOne(@Param('nis') nis: string) {
    return this.siswaService.findOne(nis);
  }

  // POST /api/siswa - Create siswa
  @Post()
  @ApiOperation({ summary: 'Create new student data' })
  async create(@Body() createSiswaDto: CreateSiswaDto) {
    return this.siswaService.create(createSiswaDto);
  }

  // PUT /api/siswa/:nis - Update siswa
  @Put(':nis')
  @ApiOperation({ summary: 'Update student data by NIS' })
  async update(
    @Param('nis') nis: string,
    @Body() updateSiswaDto: UpdateSiswaDto,
  ) {
    return this.siswaService.update(nis, updateSiswaDto);
  }

  // DELETE /api/siswa/:nis - Delete siswa
  @Delete(':nis')
  @ApiOperation({ summary: 'Delete student data by NIS' })
  async remove(@Param('nis') nis: string) {
    return this.siswaService.remove(nis);
  }

  // POST /api/siswa/import - Import Excel
//   @Post('import')
//   @UseInterceptors(FileInterceptor('file'))
//   async import(@UploadedFile() file: UploadedExcelFile) {
//     if (!file) {
//       return {
//         success: false,
//         message: 'File tidak ditemukan',
//       };
//     }

//     // Validate file type
//     const allowedTypes = [
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
//       'application/vnd.ms-excel.sheet.macroEnabled.12', // xlsm
//       'application/vnd.ms-excel.sheet.binary.macroEnabled.12', // xlsb
//       'text/csv', // csv
//       'application/csv',
//       'text/plain',
//       'application/vnd.ms-excel',
//     ];

//     if (!allowedTypes.includes(file.mimetype)) {
//       return {
//         success: false,
//         message: 'Format file tidak didukung. Gunakan xlsx, xlsm, xlsb, atau csv',
//       };
//     }

//     return this.siswaService.importExcel(file);
//   }
  
}

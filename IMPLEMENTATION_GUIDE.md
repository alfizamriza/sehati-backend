/**
 * IMPLEMENTATION GUIDE
 * 
 * This guide shows how to use the new backend patterns:
 * 1. Repository Pattern
 * 2. Global Exception Filter
 * 3. Response Interceptor
 * 4. Config Management
 * 5. Constants
 */

// ============================================
// 1. USING REPOSITORY PATTERN
// ============================================

// In your module:
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SiswaRepository } from 'src/database/repositories/siswa.repository';
import { SiswaController } from './siswa.controller';
import { SiswaService } from './siswa.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SiswaController],
  providers: [SiswaService, SiswaRepository],
})
export class SiswaModule {}

// In your service:
import { Injectable } from '@nestjs/common';
import { SiswaRepository } from 'src/database/repositories/siswa.repository';

@Injectable()
export class SiswaService {
  constructor(private siswaRepository: SiswaRepository) {}

  async findAll() {
    return this.siswaRepository.findAll();
  }

  async findByNis(nis: string) {
    return this.siswaRepository.findByNis(nis);
  }

  async create(data: any) {
    return this.siswaRepository.create(data);
  }

  async update(id: string, data: any) {
    return this.siswaRepository.update(id, data);
  }

  async delete(id: string) {
    return this.siswaRepository.delete(id);
  }
}

// ============================================
// 2. GLOBAL EXCEPTION FILTER
// ============================================

// Already applied in main.ts
// Automatically catches all exceptions and returns standardized error format:
// {
//   "success": false,
//   "message": "Error message",
//   "error": {
//     "code": "ERROR_CODE",
//     "details": {},
//     "timestamp": "2026-02-28T..."
//   }
// }

// ============================================
// 3. RESPONSE INTERCEPTOR
// ============================================

// Already applied in main.ts
// Automatically wraps all responses in standardized format:
// {
//   "success": true,
//   "message": "Data retrieved successfully",
//   "data": { ... },
//   "timestamp": "2026-02-28T...",
//   "path": "/api/siswa"
// }

// If you already return this format, the interceptor won't double-wrap it.

// ============================================
// 4. CONFIG MANAGEMENT
// ============================================

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Get app config
    const port = this.configService.get<number>('app.port');
    const env = this.configService.get<string>('app.nodeEnv');

    // Get JWT config
    const jwtSecret = this.configService.get<string>('jwt.secret');
    const jwtExpires = this.configService.get<string>('jwt.expiresIn');

    // Get database config
    const supabaseUrl = this.configService.get<string>('database.supabase.url');

    // Get CORS config
    const origins = this.configService.get<string[]>('cors.origins');
  }
}

// ============================================
// 5. USING CONSTANTS
// ============================================

import { SUCCESS_MESSAGES, ERROR_MESSAGES, VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

@Injectable()
export class SiswaService {
  async createSiswa(data: any) {
    // Use message constants
    try {
      const result = await this.siswaRepository.create(data);
      return {
        success: true,
        message: SUCCESS_MESSAGES.SISWA_CREATED,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}

// ============================================
// 6. CREATING CUSTOM REPOSITORIES
// ============================================

import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BaseRepository } from 'src/database/repositories/base.repository';

interface Guru {
  id?: string;
  nip: string;
  nama: string;
  peran?: string;
  // ... other fields
}

@Injectable()
export class GuruRepository extends BaseRepository<Guru> {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService, 'guru'); // table name
  }

  // Add custom methods
  async findByNip(nip: string): Promise<Guru | null> {
    return this.findOneByField('nip', nip);
  }

  async findByPeran(peran: string): Promise<Guru[]> {
    return this.findByField('peran', peran);
  }
}

// ============================================
// 7. ERROR HANDLING IN CONTROLLERS
// ============================================

import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants/messages.constant';

@Controller('api/siswa')
export class SiswaController {
  constructor(private siswaService: SiswaService) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    const siswa = await this.siswaService.findById(id);

    if (!siswa) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND);
    }

    return siswa;
    // Response will be automatically wrapped by interceptor:
    // {
    //   "success": true,
    //   "message": "Data retrieved successfully",
    //   "data": { ... }
    // }
  }
}

// ============================================
// 8. DTO WITH SWAGGER DECORATORS
// ============================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateSiswaDto {
  @ApiProperty({
    example: '1234567890',
    description: 'Student NIS (10-20 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'NIS wajib diisi' })
  @Length(10, 20, { message: VALIDATION_MESSAGES.NIS_LENGTH })
  nis!: string;

  @ApiProperty({
    example: 'Ahmad Fauzi',
    description: 'Student full name',
  })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.NAME_REQUIRED })
  nama!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Student password (minimum 6 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.PASSWORD_REQUIRED })
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN })
  password!: string;
}

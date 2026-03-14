# Backend Architecture Guide

## Overview

This guide explains the refactored backend architecture with focus on:
- **Global Exception Handling** - Standardized error responses
- **Response Interceptor** - Consistent API response format
- **Config Management** - Centralized configuration
- **Repository Pattern** - Abstraction of data access layer
- **Constants** - Centralized message and constant definitions

---

## Project Structure

```
src/
├── common/                          # Shared utilities
│   ├── constants/
│   │   └── messages.constant.ts    # Success/error messages
│   ├── decorators/                 # Custom decorators
│   ├── enums/                      # Enums (UserRole, etc.)
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── guards/                     # Auth guards
│   ├── helpers/
│   ├── interfaces/
│   │   └── response.interface.ts   # API response types
│   ├── interceptors/
│   │   └── response.interceptor.ts
│   └── logger/
│       └── app.logger.ts
├── config/
│   └── app.config.ts               # Configuration management
├── database/
│   └── repositories/
│       ├── base.repository.ts      # Base class for all repos
│       ├── siswa.repository.ts     # Student repository
│       └── ...                     # Other repositories
├── modules/                         # Feature modules
│   ├── auth/
│   ├── siswa/
│   ├── guru/
│   └── ...
├── app.module.ts                   # Root module
└── main.ts                          # Entry point
```

---

## 1. Global Exception Filter

### Location
`src/common/filters/global-exception.filter.ts`

### How It Works
Automatically catches all exceptions and converts them to standardized error format.

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2026-02-28T10:30:00Z"
  }
}
```

### Usage in Code
```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Get(':id')
async findById(@Param('id') id: string) {
  const siswa = await this.siswaService.findById(id);
  
  if (!siswa) {
    throw new NotFoundException('Siswa tidak ditemukan');
  }
  
  return siswa;
}
```

---

## 2. Response Interceptor

### Location
`src/common/interceptors/response.interceptor.ts`

### How It Works
Wraps all successful responses in a standardized format.

### Success Response Format
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": { /* your data */ },
  "timestamp": "2026-02-28T10:30:00Z",
  "path": "/api/siswa"
}
```

### Auto-Wrapping
If your method already returns `{ success, message, data }`, the interceptor won't double-wrap it.

### Example
```typescript
@Get()
async findAll() {
  const siswa = await this.siswaRepository.findAll();
  return siswa; // Automatically wrapped: { success: true, message: "...", data: siswa }
}
```

---

## 3. Config Management

### Location
`src/config/app.config.ts`

### How It Works
Uses `@nestjs/config` to manage environment variables and provide type-safe access.

### Available Configurations

#### App Config
```typescript
const appConfig = configService.get('app'); // {port, nodeEnv, name, version}
```

#### JWT Config
```typescript
const jwtConfig = configService.get('jwt'); // {secret, expiresIn, refreshSecret, ...}
```

#### Database Config
```typescript
const dbConfig = configService.get('database'); // {supabase, firebase}
```

#### CORS Config
```typescript
const corsConfig = configService.get('cors'); // {origins, credentials, methods, ...}
```

### Environment Variables
See `.env.example` for all available variables.

### Usage in Service
```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  method() {
    const port = this.configService.get<number>('app.port');
    const jwtSecret = this.configService.get<string>('jwt.secret');
  }
}
```

---

## 4. Repository Pattern

### Location
`src/database/repositories/`

### How It Works
Provides a base class with common CRUD operations and error handling.

### Base Repository Methods

```typescript
// Find operations
findById(id: string | number): Promise<T | null>
findByField(field: string, value: any): Promise<T[]>
findOneByField(field: string, value: any): Promise<T | null>
findAll(filter?: Record<string, any>): Promise<T[]>

// Create operations
create(payload: Partial<T>): Promise<T>
createMany(payloads: Partial<T>[]): Promise<T[]>

// Update operations
update(id: string | number, payload: Partial<T>): Promise<T>

// Delete operations
delete(id: string | number): Promise<void>

// Utility operations
exists(field: string, value: any): Promise<boolean>
count(filter?: Record<string, any>): Promise<number>
```

### Creating a Custom Repository

```typescript
// src/database/repositories/guru.repository.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BaseRepository } from './base.repository';

interface Guru {
  id?: string;
  nip: string;
  nama: string;
  peran?: string;
}

@Injectable()
export class GuruRepository extends BaseRepository<Guru> {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService, 'guru');
  }

  // Add custom methods
  async findByNip(nip: string): Promise<Guru | null> {
    return this.findOneByField('nip', nip);
  }

  async findByPeran(peran: string): Promise<Guru[]> {
    return this.findByField('peran', peran);
  }
}
```

### Using Repository in Service

```typescript
import { Injectable } from '@nestjs/common';
import { GuruRepository } from 'src/database/repositories/guru.repository';

@Injectable()
export class GuruService {
  constructor(private guruRepository: GuruRepository) {}

  async findAll() {
    return this.guruRepository.findAll();
  }

  async findByNip(nip: string) {
    return this.guruRepository.findByNip(nip);
  }

  async create(data: Partial<Guru>) {
    return this.guruRepository.create(data);
  }

  async update(id: string, data: Partial<Guru>) {
    return this.guruRepository.update(id, data);
  }

  async delete(id: string) {
    return this.guruRepository.delete(id);
  }
}
```

### Using Repository in Module

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { GuruRepository } from 'src/database/repositories/guru.repository';
import { GuruController } from './guru.controller';
import { GuruService } from './guru.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GuruController],
  providers: [GuruService, GuruRepository],
})
export class GuruModule {}
```

---

## 5. Constants and Messages

### Location
`src/common/constants/messages.constant.ts`

### Available Constants

#### Success Messages
```typescript
SUCCESS_MESSAGES.LOGIN_SUCCESS         // "Login berhasil"
SUCCESS_MESSAGES.SISWA_CREATED         // "Siswa berhasil ditambahkan"
SUCCESS_MESSAGES.UPDATED               // "Data berhasil diperbarui"
// ... and more
```

#### Error Messages
```typescript
ERROR_MESSAGES.INVALID_CREDENTIALS     // "Kredensial tidak valid"
ERROR_MESSAGES.NOT_FOUND               // "Data tidak ditemukan"
ERROR_MESSAGES.DATABASE_ERROR          // "Kesalahan database"
// ... and more
```

#### Validation Messages
```typescript
VALIDATION_MESSAGES.NIS_REQUIRED       // "NIS harus diisi"
VALIDATION_MESSAGES.PASSWORD_MIN       // "Password minimal 6 karakter"
// ... and more
```

### Usage

```typescript
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from 'src/common/constants/messages.constant';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class SiswaService {
  async create(data: CreateSiswaDto) {
    try {
      const siswa = await this.siswaRepository.create(data);
      return {
        success: true,
        message: SUCCESS_MESSAGES.SISWA_CREATED,
        data: siswa,
      };
    } catch (error) {
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}
```

---

## 6. DTOs with Swagger Decorators

### Location
`src/modules/*/dto/`

### Example
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { VALIDATION_MESSAGES } from 'src/common/constants/messages.constant';

export class CreateSiswaDto {
  @ApiProperty({
    example: '1234567890',
    description: 'Student NIS (10-20 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.NIS_REQUIRED })
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
    description: 'Password (minimum 6 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.PASSWORD_REQUIRED })
  @MinLength(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN })
  password!: string;
}
```

---

## 7. Controllers with Swagger

### Example
```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SiswaService } from './siswa.service';
import { CreateSiswaDto } from './dto/create-siswa.dto';

@ApiTags('Siswa')
@Controller('api/siswa')
export class SiswaController {
  constructor(private siswaService: SiswaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async findAll() {
    return this.siswaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findById(@Param('id') id: string) {
    return this.siswaService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new student' })
  @ApiResponse({ status: 201, description: 'Student created' })
  async create(@Body() createSiswaDto: CreateSiswaDto) {
    return this.siswaService.create(createSiswaDto);
  }
}
```

---

## 8. Error Handling Best Practices

### Do's ✅
```typescript
// ✅ Use specific exceptions
throw new NotFoundException('Siswa tidak ditemukan');
throw new BadRequestException('Data tidak valid');
throw new UnauthorizedException('Kredensial tidak valid');

// ✅ Use constants for messages
throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);

// ✅ Let global filter handle the response
// (Don't manually format error responses)
```

### Don'ts ❌
```typescript
// ❌ Don't use generic Error
throw new Error('Something went wrong');

// ❌ Don't use custom error objects
throw { statusCode: 400, message: 'Error' };

// ❌ Don't return error responses manually
return { success: false, error: 'Not found' };
```

---

## 9. API Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "id": "123",
    "nis": "1234567890",
    "nama": "Ahmad Fauzi",
    "kelas_id": 5
  },
  "timestamp": "2026-02-28T10:30:00.000Z",
  "path": "/api/siswa/123"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Siswa tidak ditemukan",
  "error": {
    "code": "NOT_FOUND",
    "details": null,
    "timestamp": "2026-02-28T10:30:00.000Z"
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "validationErrors": [
        "nis should not be empty",
        "nama should not be empty"
      ]
    },
    "timestamp": "2026-02-28T10:30:00.000Z"
  }
}
```

---

## 10. Testing the New Architecture

### Test Exception Filter
```bash
# Make request with invalid data
curl -X POST http://localhost:3001/api/siswa \
  -H "Content-Type: application/json" \
  -d '{"nama": "Test"}'

# Should return error in standardized format with 400 status
```

### Test Response Interceptor
```bash
# Make valid request
curl http://localhost:3001/api/siswa/123

# Should return data in standardized format with success: true
```

### Check Swagger Docs
```
http://localhost:3001/api/docs
```

---

## 11. Frontend Integration

The frontend's `lib/api.ts` has been updated to handle the new response format:

```typescript
// Now expects:
// { success: true, message: "...", data: {...} }

// Error response:
// { status, message, code, details }
```

Update frontend services to use:
```typescript
const res = await api.get('/siswa');
if (res.data.success) {
  // Access data via res.data.data
  const siswaList = res.data.data;
}
```

---

## 12. Migration Checklist

- [x] Create global exception filter
- [x] Create response interceptor
- [x] Create config management
- [x] Create base repository
- [x] Create message constants
- [x] Update main.ts with filters
- [x] Create DTOs with Swagger
- [x] Update auth module
- [ ] Create remaining repositories (Guru, Kelas, etc.)
- [ ] Update remaining modules to use repositories
- [ ] Add comprehensive error handling
- [ ] Add test coverage
- [ ] Update all DTOs with Swagger decorators
- [ ] Update remaining controllers with Swagger

---

## 13. Next Steps

1. **Create repositories** for remaining entities
   - GuruRepository
   - KelasRepository
   - VoucherRepository
   - etc.

2. **Update services** to use repositories instead of direct Supabase calls

3. **Add Swagger decorators** to all DTOs and endpoints

4. **Implement comprehensive testing** with 80%+ coverage

5. **Add API versioning** if needed (e.g., `/api/v1/...`)

6. **Setup CI/CD** with automated testing and deployment

---

## Questions or Issues?

Refer to the `IMPLEMENTATION_GUIDE.md` for detailed examples and code snippets.

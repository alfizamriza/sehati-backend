# Quick Start Guide - New Backend Architecture

## 🚀 Quick Setup

### 1. Setup Environment
```bash
cd sehati-backend
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run start:dev
```

### 4. View API Documentation
```
http://localhost:3001/api/docs
```

---

## 📋 Quick Checklists

### Creating a New Feature Module

```typescript
// 1. Create repository (src/database/repositories/MyEntity.repository.ts)
@Injectable()
export class MyEntityRepository extends BaseRepository<MyEntity> {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService, 'my_entity_table');
  }
}

// 2. Add to DatabaseModule (src/database/database.module.ts)
providers: [SupabaseService, BaseRepository, MyEntityRepository]
exports: [SupabaseService, BaseRepository, MyEntityRepository]

// 3. Create DTOs with Swagger (src/modules/my-entity/dto/create-my-entity.dto.ts)
export class CreateMyEntityDto {
  @ApiProperty({ example: 'value' })
  @IsString()
  @IsNotEmpty()
  field!: string;
}

// 4. Create service (src/modules/my-entity/my-entity.service.ts)
@Injectable()
export class MyEntityService {
  constructor(private myEntityRepository: MyEntityRepository) {}

  async findAll() {
    return this.myEntityRepository.findAll();
  }

  async create(data: CreateMyEntityDto) {
    return this.myEntityRepository.create(data);
  }
}

// 5. Create controller (src/modules/my-entity/my-entity.controller.ts)
@ApiTags('MyEntity')
@Controller('api/my-entity')
export class MyEntityController {
  constructor(private myEntityService: MyEntityService) {}

  @Get()
  @ApiOperation({ summary: 'Get all' })
  findAll() {
    return this.myEntityService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create' })
  create(@Body() dto: CreateMyEntityDto) {
    return this.myEntityService.create(dto);
  }
}

// 6. Create module (src/modules/my-entity/my-entity.module.ts)
@Module({
  imports: [DatabaseModule],
  providers: [MyEntityService, MyEntityRepository],
  controllers: [MyEntityController],
})
export class MyEntityModule {}

// 7. Add to AppModule (src/app.module.ts)
imports: [
  ConfigModule.forRoot({ ... }),
  MyEntityModule,
  // ... other modules
]
```

---

## ✅ Error Handling

### Use Built-in Exceptions
```typescript
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

// ✅ Good
throw new NotFoundException('Siswa tidak ditemukan');
throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);

// ❌ Bad
throw new Error('Siswa tidak ditemukan');
return { error: 'Not found' };
```

### Global Error Filter
All exceptions are automatically caught and formatted:
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2026-02-28T..."
  }
}
```

---

## 📝 Response Format

### Success Response
All successful responses are automatically wrapped:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": { /* your data */ },
  "timestamp": "2026-02-28T...",
  "path": "/api/siswa"
}
```

You just return your data:
```typescript
@Get()
async findAll() {
  const data = await this.repository.findAll();
  return data; // Automatically wrapped!
}
```

---

## 🔧 Using Repository Pattern

### Basic Operations
```typescript
// Find by ID
const record = await this.repository.findById('123');

// Find by field
const records = await this.repository.findByField('status', 'active');

// Find one by field
const record = await this.repository.findOneByField('nis', '1234567890');

// Find all
const records = await this.repository.findAll();

// Find with filter
const records = await this.repository.findAll({ status: 'active' });

// Create
const record = await this.repository.create({ name: 'John' });

// Create multiple
const records = await this.repository.createMany([
  { name: 'John' },
  { name: 'Jane' },
]);

// Update
const record = await this.repository.update('123', { name: 'John Updated' });

// Delete
await this.repository.delete('123');

// Check existence
const exists = await this.repository.exists('nis', '1234567890');

// Count
const total = await this.repository.count();
const active = await this.repository.count({ status: 'active' });
```

### Custom Methods in Repository
```typescript
@Injectable()
export class SiswaRepository extends BaseRepository<Siswa> {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService, 'siswa');
  }

  // Custom method
  async findByNis(nis: string): Promise<Siswa | null> {
    return this.findOneByField('nis', nis);
  }

  // Another custom method
  async findActiveByKelas(kelasId: number): Promise<Siswa[]> {
    const siswa = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .eq('kelas_id', kelasId)
      .eq('status_aktif', true);
    return siswa.data || [];
  }
}
```

---

## 💬 Using Constants

### In Service
```typescript
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from 'src/common/constants/messages.constant';

async create(data: CreateSiswaDto) {
  try {
    const result = await this.repository.create(data);
    return {
      success: true,
      message: SUCCESS_MESSAGES.SISWA_CREATED,
      data: result,
    };
  } catch (error) {
    throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
  }
}
```

### Available Constants
```typescript
// Success messages
SUCCESS_MESSAGES.LOGIN_SUCCESS
SUCCESS_MESSAGES.SISWA_CREATED
SUCCESS_MESSAGES.UPDATED
// ... and more

// Error messages
ERROR_MESSAGES.INVALID_CREDENTIALS
ERROR_MESSAGES.NOT_FOUND
ERROR_MESSAGES.DATABASE_ERROR
// ... and more

// Validation messages
VALIDATION_MESSAGES.NIS_REQUIRED
VALIDATION_MESSAGES.PASSWORD_MIN
// ... and more
```

---

## 🎨 Swagger Documentation

### In Controller
```typescript
@ApiTags('Siswa')
@Controller('api/siswa')
export class SiswaController {
  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findById(@Param('id') id: string) {
    return this.siswaService.findById(id);
  }
}
```

### In DTO
```typescript
export class CreateSiswaDto {
  @ApiProperty({
    example: '1234567890',
    description: 'Student NIS (10-20 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'NIS wajib diisi' })
  nis!: string;
}
```

---

## 🔐 Configuration

### Access Config in Service
```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  method() {
    // App config
    const port = this.configService.get<number>('app.port');
    const nodeEnv = this.configService.get<string>('app.nodeEnv');

    // JWT config
    const jwtSecret = this.configService.get<string>('jwt.secret');

    // Database config
    const supabaseUrl = this.configService.get<string>('database.supabase.url');

    // CORS config
    const origins = this.configService.get<string[]>('cors.origins');
  }
}
```

### Environment Variables
See `.env.example` for all available configuration keys.

---

## 🧪 Common Patterns

### Pattern 1: Find or Create
```typescript
async findOrCreate(nis: string, data: CreateSiswaDto) {
  let siswa = await this.repository.findByNis(nis);
  
  if (!siswa) {
    siswa = await this.repository.create(data);
  }
  
  return siswa;
}
```

### Pattern 2: Find and Update
```typescript
async findAndUpdate(nis: string, data: UpdateSiswaDto) {
  const siswa = await this.repository.findByNis(nis);
  
  if (!siswa) {
    throw new NotFoundException('Siswa tidak ditemukan');
  }
  
  return this.repository.update(siswa.id, data);
}
```

### Pattern 3: Bulk Operations
```typescript
async bulkCreate(dataList: CreateSiswaDto[]) {
  return this.repository.createMany(dataList);
}

async bulkDelete(ids: string[]) {
  const promises = ids.map(id => this.repository.delete(id));
  await Promise.all(promises);
}
```

---

## 🐛 Debugging

### Check Error Responses
All errors are logged to console with:
- Timestamp
- Log level (ERROR, WARN, etc.)
- Context
- Error details

### Enable Debug Logging
```bash
# In .env.local
LOG_LEVEL=debug
NODE_ENV=development
```

### View Swagger Docs
```
http://localhost:3001/api/docs
```

---

## ⚡ Performance Tips

### Use Pagination for Large Datasets
```typescript
async findAllPaginated(page: number, limit: number) {
  const skip = (page - 1) * limit;
  // Implement manual pagination or add pagination to repository
}
```

### Index Frequently Queried Fields
In Supabase: Create indexes on `nis`, `nip`, `kelas_id`, etc.

### Cache When Appropriate
```typescript
private cache = new Map();

async findById(id: string) {
  if (this.cache.has(id)) {
    return this.cache.get(id);
  }
  const data = await this.repository.findById(id);
  this.cache.set(id, data);
  return data;
}
```

---

## 📚 Documentation

- `ARCHITECTURE_GUIDE.md` - Detailed architecture explanation
- `IMPLEMENTATION_GUIDE.md` - Implementation examples
- `.env.example` - Configuration reference
- Swagger docs - API documentation (http://localhost:3001/api/docs)

---

## 🆘 Need Help?

1. Check `ARCHITECTURE_GUIDE.md` for detailed explanations
2. Check `IMPLEMENTATION_GUIDE.md` for code examples
3. Open Swagger docs for endpoint details
4. Review existing modules for patterns
5. Check error messages in logs

Good luck! 🚀

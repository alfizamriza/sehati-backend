import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/health')
export class HealthController {
  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Get('check')
  async healthCheck() {
    const checks: any = {
      timestamp: new Date().toISOString(),
    };

    try {
      const url = this.configService.get('SUPABASE_URL');
      const key = this.configService.get('SUPABASE_KEY');
      const serviceRoleKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
      const secretKey = this.configService.get('SUPABASE_SECRET_KEY');

      checks.supabase_env = {
        url: url ? 'OK' : 'Missing',
        publishableKey: key ? 'Set' : 'Missing',
        serverKey: serviceRoleKey || secretKey ? 'Set' : 'Missing',
      };
    } catch {
      checks.supabase_env = { error: 'Failed to check env' };
    }

    try {
      const client = this.supabaseService.getClient();
      if (client) {
        checks.supabase_client = 'OK';
      }
    } catch (error) {
      checks.supabase_client = error instanceof Error ? error.message : 'Error';
    }

    try {
      await this.supabaseService.queryCollection('users', 'id', 'test');
      checks.users_table = 'OK';
    } catch (error) {
      checks.users_table = error instanceof Error ? error.message : 'Error';
    }

    return {
      status: 'OK',
      checks,
      message: 'Server is running. Check each item above to diagnose issues.',
    };
  }

  @Public()
  @Get('schema/users')
  async getUsersSchema() {
    try {
      await this.supabaseService.queryCollection('users', 'username', 'non-existent-user-xyz');

      const client = this.supabaseService.getClient();
      const { data, error } = await client.from('users').select().limit(1);

      if (error) {
        throw new Error(`Could not fetch schema: ${error.message}`);
      }

      if (data && data.length > 0) {
        return {
          columns: Object.keys(data[0]),
          sample: data[0],
          success: true,
        };
      }

      return {
        message: 'Table exists but is empty. No sample data available.',
        suggested_columns: [
          'id (UUID)',
          'username (TEXT)',
          'password (TEXT)',
          'nama (TEXT)',
          'role (TEXT)',
          'created_at (TIMESTAMP)',
          'is_active (BOOLEAN)',
        ],
      };
    } catch (error) {
      throw new HttpException(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          suggestion:
            'Tabel users mungkin tidak ada. Jalankan SQL script di MIGRATION_GUIDE.md',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

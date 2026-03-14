import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

@Controller()
export class AppController {
  constructor(private supabaseService: SupabaseService) {}

  @Get('test')
  async testConnection() {
    const supabase = this.supabaseService.getClient();
      
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('users')
      .select('nama');

    console.log('Data:', data);
    console.log('Error:', error);

    return {
      success: !error,
      data: data,
      error: error,
      message: error ? error.message : 'Success!'
    };
  }
}
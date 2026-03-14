import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';


@Injectable()
export class AppService {
  constructor(private supabaseService: SupabaseService) {}

  async getUsers() {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('nama, password_hash');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
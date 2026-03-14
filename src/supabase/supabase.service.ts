import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const supabaseServiceKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_SECRET_KEY');
    const supabaseKey =
      supabaseServiceKey ||
      this.configService.getOrThrow<string>('SUPABASE_KEY');

    if (supabaseUrl.includes('your-project.supabase.co')) {
      throw new Error(
        'SUPABASE_URL masih placeholder (your-project.supabase.co). Perbaiki .env/.env.local.',
      );
    }

    if (
      supabaseKey === 'your-service-role-key' ||
      supabaseKey === 'your-anon-key'
    ) {
      throw new Error(
        'SUPABASE key masih placeholder. Set SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_SECRET_KEY untuk backend.',
      );
    }

    if (!supabaseServiceKey && supabaseKey.startsWith('sb_publishable_')) {
      const message =
        'Backend sedang memakai Supabase publishable key. Set SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_SECRET_KEY di .env backend.';

      if (nodeEnv === 'production') {
        throw new Error(message);
      }

      console.warn(`[SupabaseService] ${message}`);
    }

    this.supabase = createClient(
      supabaseUrl,
      supabaseKey,
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Helper methods untuk CRUD operations
  async getDocument(table: string, docId: string) {
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', docId)
      .single();

    if (error) {
      return null;
    }
    return data;
  }

  async queryCollection(table: string, field: string, value: any) {
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq(field, value);

    if (error) {
      return [];
    }
    return data || [];
  }

  async createDocument(table: string, data: any, docId?: string) {
    const insertData = docId ? { ...data, id: docId } : data;

    // Remove null/undefined values
    const cleanData = Object.fromEntries(
      Object.entries(insertData).filter(([, v]) => v != null)
    );

    const { data: createdData, error } = await this.supabase
      .from(table)
      .insert([cleanData])
      .select()
      .single();

    if (error) {
      console.error(`[SupabaseService] Create error on table '${table}':`, error);
      throw new Error(`Failed to create document: ${error.message}`);
    }
    return createdData;
  }

  async updateDocument(table: string, docId: string, data: any) {
    const { data: updatedData, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', docId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
    return updatedData;
  }

  async deleteDocument(table: string, docId: string) {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', docId);

    if (error) {
      console.error(`[SupabaseService] Delete error on table '${table}':`, error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }
}

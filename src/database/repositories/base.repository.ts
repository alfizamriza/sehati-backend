import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Generic Repository Pattern for Supabase
 * Provides common CRUD operations with error handling
 */
@Injectable()
export class BaseRepository<T> {
  protected logger = new Logger(this.constructor.name);

  constructor(
    protected supabaseService: SupabaseService,
    protected tableName: string,
  ) {}

  /**
   * Find a single document by ID
   */
  async findById(id: string | number): Promise<T | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.mapError(error);
      }

      return data as T;
    } catch (error) {
      throw this.handleError('findById', error);
    }
  }

  /**
   * Find documents by field
   */
  async findByField(field: string, value: any): Promise<T[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .select('*')
        .eq(field, value);

      if (error) {
        throw this.mapError(error);
      }

      return (data || []) as T[];
    } catch (error) {
      throw this.handleError('findByField', error);
    }
  }

  /**
   * Find a single document by field
   */
  async findOneByField(field: string, value: any): Promise<T | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .select('*')
        .eq(field, value)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.mapError(error);
      }

      return data as T;
    } catch (error) {
      throw this.handleError('findOneByField', error);
    }
  }

  /**
   * Find all documents with optional filtering
   */
  async findAll(filter?: Record<string, any>): Promise<T[]> {
    try {
      let query = this.supabaseService.getClient().from(this.tableName).select('*');

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;

      if (error) {
        throw this.mapError(error);
      }

      return (data || []) as T[];
    } catch (error) {
      throw this.handleError('findAll', error);
    }
  }

  /**
   * Create a new document
   */
  async create(payload: Partial<T>): Promise<T> {
    try {
      const cleanData = this.removeNullableFields(payload);

      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .insert([cleanData])
        .select()
        .single();

      if (error) {
        throw this.mapError(error);
      }

      return data as T;
    } catch (error) {
      throw this.handleError('create', error);
    }
  }

  /**
   * Create multiple documents
   */
  async createMany(payloads: Partial<T>[]): Promise<T[]> {
    try {
      const cleanedData = payloads.map((p) => this.removeNullableFields(p));

      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .insert(cleanedData)
        .select();

      if (error) {
        throw this.mapError(error);
      }

      return (data || []) as T[];
    } catch (error) {
      throw this.handleError('createMany', error);
    }
  }

  /**
   * Update a document
   */
  async update(id: string | number, payload: Partial<T>): Promise<T> {
    try {
      const cleanData = this.removeNullableFields(payload);

      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw this.mapError(error);
      }

      return data as T;
    } catch (error) {
      throw this.handleError('update', error);
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string | number): Promise<void> {
    try {
      const { error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.mapError(error);
      }
    } catch (error) {
      throw this.handleError('delete', error);
    }
  }

  /**
   * Check if document exists
   */
  async exists(field: string, value: any): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .select('id')
        .eq(field, value)
        .single();

      if (error && error.code === 'PGRST116') {
        return false;
      }

      if (error) {
        throw this.mapError(error);
      }

      return !!data;
    } catch (error) {
      throw this.handleError('exists', error);
    }
  }

  /**
   * Count documents with optional filter
   */
  async count(filter?: Record<string, any>): Promise<number> {
    try {
      let query = this.supabaseService.getClient().from(this.tableName).select('id');

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { count, error } = await query;

      if (error) {
        throw this.mapError(error);
      }

      return count || 0;
    } catch (error) {
      throw this.handleError('count', error);
    }
  }

  /**
   * Remove null or undefined fields
   */
  protected removeNullableFields(obj: any): any {
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value != null),
    );
  }

  /**
   * Map Supabase errors to meaningful messages
   */
  protected mapError(error: PostgrestError): Error {
    const errorMap: Record<string, string> = {
      '23505': 'Data already exists',
      '23503': 'Invalid reference or foreign key',
      '23502': 'Required field is missing',
      '42P01': 'Table does not exist',
    };

    const message = errorMap[error.code] || error.message;
    return new Error(message);
  }

  /**
   * Handle and log errors
   */
  protected handleError(methodName: string, error: any): never {
    const message = error?.message || 'Unknown error';
    const errorInfo = {
      table: this.tableName,
      method: methodName,
      error: message,
    };

    this.logger.error(`Database operation failed: ${JSON.stringify(errorInfo)}`);
    throw new InternalServerErrorException(message);
  }
}

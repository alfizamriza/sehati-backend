import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BaseRepository } from '../../database/repositories/base.repository';

export interface Siswa {
  id?: string;
  nis: string;
  nama: string;
  kelas_id: number;
  password_hash?: string;
  status_aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class SiswaRepository extends BaseRepository<Siswa> {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService, 'siswa');
  }

  /**
   * Find student by NIS
   */
  async findByNis(nis: string): Promise<Siswa | null> {
    return this.findOneByField('nis', nis);
  }

  /**
   * Find students by class ID
   */
  async findByKelasId(kelasId: number): Promise<Siswa[]> {
    return this.findByField('kelas_id', kelasId);
  }

  /**
   * Find active students
   */
  async findActive(): Promise<Siswa[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .select('*')
        .eq('status_aktif', true);

      if (error) {
        throw this.mapError(error);
      }

      return (data || []) as Siswa[];
    } catch (error) {
      throw this.handleError('findActive', error);
    }
  }

  /**
   * Find active students by class
   */
  async findActiveByKelas(kelasId: number): Promise<Siswa[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from(this.tableName)
        .select('*')
        .eq('kelas_id', kelasId)
        .eq('status_aktif', true);

      if (error) {
        throw this.mapError(error);
      }

      return (data || []) as Siswa[];
    } catch (error) {
      throw this.handleError('findActiveByKelas', error);
    }
  }

  /**
   * Check if student with NIS exists
   */
  async existsByNis(nis: string): Promise<boolean> {
    return this.exists('nis', nis);
  }

  /**
   * Count students in a class
   */
  async countByKelas(kelasId: number): Promise<number> {
    return this.count({ kelas_id: kelasId });
  }
}

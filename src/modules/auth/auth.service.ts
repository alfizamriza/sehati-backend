import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { SupabaseService } from '../../supabase/supabase.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AchievementService } from '../achievement/achievement.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private supabaseService: SupabaseService,
    private achievementService: AchievementService,
  ) { }

  async login(loginDto: LoginDto) {
    const supabase = this.supabaseService.getClient();
    let user: any;
    const identifier = loginDto.identifier.trim();

    // 1. Query berdasarkan role
    if (loginDto.role === 'kantin' || loginDto.role === 'admin') {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', identifier)
        .single();

      if (error || !data) {
        throw new UnauthorizedException('Username tidak ditemukan');
      }
      user = data;
    } else if (loginDto.role === 'guru') {
      const { data, error } = await supabase
        .from('guru')
        .select('*')
        .eq('nip', identifier)
        .single();

      if (error || !data) {
        throw new UnauthorizedException('NIP tidak ditemukan');
      }
      user = data;
    } else if (loginDto.role === 'siswa') {
      const { data, error } = await supabase
        .from('siswa')
        .select('*')
        .eq('nis', identifier)
        .single();

      if (error || !data) {
        throw new UnauthorizedException('NIS tidak ditemukan');
      }
      user = data;
    } else {
      throw new BadRequestException('Role tidak valid');
    }

    // 2. ⚠️ DOUBLE CHECK ROLE (untuk users table)
    if ((loginDto.role === 'kantin' || loginDto.role === 'admin') && user.role !== loginDto.role) {
      throw new UnauthorizedException(
        `Role yang dipilih salah. Akun ini terdaftar sebagai ${user.role}`
      );
    }

    // 3. Verify password
    let isPasswordValid = false;
    if (loginDto.role === 'kantin' || loginDto.role === 'admin') {
      isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    } else {
      isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password salah');
    }

    // 4. Check active status
    if (!user.is_active) {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    // Trigger evaluasi achievement saat siswa login agar reward/voucher baru bisa terproses otomatis
    if (loginDto.role === 'siswa') {
      Promise.all([
        this.achievementService.checkAndUnlockAchievements(user.nis, 'coins'),
        this.achievementService.checkAndUnlockAchievements(user.nis, 'streak'),
        this.achievementService.checkAndUnlockAchievements(user.nis, 'tumbler'),
        this.achievementService.checkAndUnlockAchievements(user.nis, 'transaksi'),
        this.achievementService.checkAndUnlockAchievements(user.nis, 'pelanggaran'),
      ]).catch((err) => {
        console.error(`[Achievement] Login trigger gagal untuk ${user.nis}:`, err);
      });
    }

    // 5. Generate JWT
    const payload = {
      sub: loginDto.role === 'siswa' 
        ? user.nis 
        : loginDto.role === 'guru' 
        ? user.nip 
        : user.id,
      role: loginDto.role,
      username: user.username || user.nama,
      ...(loginDto.role === 'guru' && { peran: user.peran }),
    };

    const token = this.jwtService.sign(payload);

    // 6. Return
    return {
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: loginDto.role === 'siswa' 
            ? user.nis 
            : loginDto.role === 'guru' 
            ? user.nip 
            : user.id.toString(),
          nama: user.nama,
          username: (loginDto.role === 'kantin' || loginDto.role === 'admin') 
            ? user.username 
            : undefined,
          role: loginDto.role,
          ...(loginDto.role === 'guru' && { peran: user.peran }),
        },
        redirectTo: this.getRedirectPath(loginDto.role),
      },
    };
  }

  async registerAdmin(registerAdminDto: RegisterAdminDto) {
    try {
      const { username, password, nama, role } = registerAdminDto;

      // Check if user already exists
      const existingUsers = await this.supabaseService.queryCollection('users', 'username', username);
      if (existingUsers.length > 0) {
        throw new BadRequestException('Username sudah terdaftar');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await this.supabaseService.createDocument('users', {
        username,
        password: hashedPassword,
        nama,
        role,
        created_at: new Date().toISOString(),
        is_active: true,
      });

      return {
        success: true,
        message: 'Registrasi berhasil',
        data: {
          id: newUser.id,
          username: newUser.username,
          nama: newUser.nama,
          role: newUser.role,
        },
      };
    } catch (error) {
      console.error('[AuthService] Register error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Gagal registrasi user'
      );
    }
  }

  async getProfile(userId: string, role: string) {
    const supabase = this.supabaseService.getClient();

    try {
      switch (role) {
        case UserRole.ADMIN:
        case UserRole.KANTIN: {
          const { data: user, error } = await supabase
            .from('users')
            .select('id, username, nama, role, is_active, created_at')
            .eq('id', userId)
            .single();

          if (error) throw error;
          if (!user) throw new UnauthorizedException('User tidak ditemukan');

          return {
            success: true,
            data: {
              id: user.id,
              username: user.username,
              nama: user.nama,
              role: user.role,
              isActive: user.is_active,
              createdAt: user.created_at,
            },
          };
        }

        case UserRole.SISWA: {
          const { data: siswa, error } = await supabase
            .from('siswa')
            .select(`nis, nama, coins, streak, last_streak_date, is_active, kelas:kelas_id (id, nama, tingkat, jurusan)`)
            .eq('nis', userId)
            .single();

          if (error) throw error;
          if (!siswa) throw new UnauthorizedException('Siswa tidak ditemukan');

          return {
            success: true,
            data: {
              nis: siswa.nis,
              nama: siswa.nama,
              role: UserRole.SISWA,
              kelas: siswa.kelas ?? null,
              coins: siswa.coins,
              streak: siswa.streak,
              lastStreakDate: siswa.last_streak_date,
              isActive: siswa.is_active,
            },
          };
        }

        case UserRole.GURU: {
          const { data: guru, error } = await supabase
            .from('guru')
            .select(`nip, nama, mata_pelajaran, peran, is_active, kelasWali:kelas_wali_id (id, nama, tingkat, jurusan)`)
            .eq('nip', userId)
            .single();

          if (error) throw error;
          if (!guru) throw new UnauthorizedException('Guru tidak ditemukan');

          return {
            success: true,
            data: {
              nip: guru.nip,
              nama: guru.nama,
              role: UserRole.GURU,
              mataPelajaran: guru.mata_pelajaran,
              peran: guru.peran,
              kelasWali: guru.kelasWali ?? null,
              isActive: guru.is_active,
            },
          };
        }

        default:
          throw new UnauthorizedException('Role tidak valid');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('[AuthService] getProfile error:', error);
      throw new UnauthorizedException('Gagal mengambil data profile');
    }
  }

  async logout() {
    return {
      success: true,
      message: 'Logout berhasil',
    };
  }

  private getCollectionByRole(role: string): string {
    switch (role) {
      case UserRole.SISWA:
        return 'siswa';
      case UserRole.GURU:
        return 'guru';
      case UserRole.ADMIN:
      case UserRole.KANTIN:
        return 'users';
      default:
        return 'users';
    }
  }

   private getRedirectPath(role: string): string {
    const paths: Record<string, string> = {
      admin: '/admin/dashboard',
      guru: '/guru/dashboard',
      siswa: '/siswa/dashboard',
      kantin: '/kantin/dashboard',
    };
    return paths[role] || '/auth';
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface LoginRequest {
  role: 'admin' | 'kantin' | 'siswa' | 'guru';
  identifier: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      nama: string;
      role: string;
    };
    redirectTo: string;
  };
}

export interface ProfileResponse {
  success: boolean;
  data: {
    id?: string;
    nis?: string;
    nip?: string;
    nama: string;
    role: string;
    username?: string;
    kelas?: {
      id: string;
      nama: string;
    };
    kelasWali?: {
      id: string;
      nama: string;
    };
    coins?: number;
    streak?: number;
  };
}

export async function loginUser(
  credentials: LoginRequest
): Promise<LoginResponse> {
  try {
    console.log('🔐 Logging in with:', {
      role: credentials.role,
      identifier: credentials.identifier,
      url: `${API_URL}/api/auth/login`,
    });

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      mode: 'cors', // Explicitly set CORS mode
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);

      try {
        const error = JSON.parse(errorText);
        throw new Error(error.message || `Login failed: ${response.status}`);
      } catch {
        throw new Error(`Login failed with status ${response.status}: ${errorText}`);
      }
    }

    const data: LoginResponse = await response.json();
    console.log('✅ Login successful:', data);

    // Save token to localStorage
    if (data.data.token) {
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user_role', data.data.user.role);
      localStorage.setItem('user_id', data.data.user.id);
    }

    return data;
  } catch (error) {
    console.error('🔥 Login error:', error);
    throw error;
  }
}

export async function getProfile(
  token: string
): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil profil');
    }

    const data: ProfileResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token');

    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      mode: 'cors',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of API response
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function getUserRole(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('user_role');
  }
  return null;
}

export function getUserId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('user_id');
  }
  return null;
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

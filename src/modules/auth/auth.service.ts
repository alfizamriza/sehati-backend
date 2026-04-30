import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { SupabaseService } from '../../supabase/supabase.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AchievementService } from '../achievement/achievement.service';
import { TokenRevocationService } from './token-revocation.service';

interface LoginAuditMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private supabaseService: SupabaseService,
    private achievementService: AchievementService,
    private tokenRevocationService: TokenRevocationService,
  ) { }

  async login(loginDto: LoginDto, meta: LoginAuditMeta = {}) {
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
        await this.recordLoginAudit({
          role: loginDto.role,
          identifier,
          status: 'failed',
          failureReason: 'Username tidak ditemukan',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
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
        await this.recordLoginAudit({
          role: loginDto.role,
          identifier,
          status: 'failed',
          failureReason: 'NIP tidak ditemukan',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
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
        await this.recordLoginAudit({
          role: loginDto.role,
          identifier,
          status: 'failed',
          failureReason: 'NIS tidak ditemukan',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
        throw new UnauthorizedException('NIS tidak ditemukan');
      }
      user = data;
    } else {
      throw new BadRequestException('Role tidak valid');
    }

    // 2. ⚠️ DOUBLE CHECK ROLE (untuk users table)
    if ((loginDto.role === 'kantin' || loginDto.role === 'admin') && user.role !== loginDto.role) {
      await this.recordLoginAudit({
        role: loginDto.role,
        identifier,
        displayName: user.nama ?? null,
        status: 'failed',
        failureReason: `Role yang dipilih salah. Akun ini terdaftar sebagai ${user.role}`,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        actorUserId: user.id?.toString?.() ?? null,
      });
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
      await this.recordLoginAudit({
        role: loginDto.role,
        identifier,
        displayName: user.nama ?? null,
        status: 'failed',
        failureReason: 'Password salah',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        actorUserId: this.resolveActorUserId(loginDto.role, user),
      });
      throw new UnauthorizedException('Password salah');
    }

    // 4. Check active status
    if (!user.is_active) {
      await this.recordLoginAudit({
        role: loginDto.role,
        identifier,
        displayName: user.nama ?? null,
        status: 'failed',
        failureReason: 'Akun tidak aktif',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        actorUserId: this.resolveActorUserId(loginDto.role, user),
      });
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
      ...(loginDto.role === 'siswa' && { permissions: user.permissions || [] }),
    };

    const token = this.jwtService.sign(payload);

    await this.recordLoginAudit({
      role: loginDto.role,
      identifier,
      displayName: user.nama ?? null,
      status: 'success',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      actorUserId: this.resolveActorUserId(loginDto.role, user),
    });

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
          ...(loginDto.role === 'siswa' && { permissions: user.permissions || [] }),
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
            .select(`nis, nama, coins, streak, last_streak_date, is_active, permissions, kelas:kelas_id (id, nama, tingkat, jurusan)`)
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
              permissions: siswa.permissions || [],
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

  async logout(token?: string | null) {
    if (token) {
      const decoded = this.jwtService.decode(token) as { exp?: number } | null;
      const expiresAtMs = decoded?.exp ? decoded.exp * 1000 : undefined;
      this.tokenRevocationService.revokeToken(token, expiresAtMs);
    }

    return {
      success: true,
      message: 'Logout berhasil',
    };
  }

  async getLoginLogs(limit = 50) {
    const supabase = this.supabaseService.getClient();
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const { data, error } = await supabase
      .from('login_audit_log')
      .select(
        'id, role, actor_user_id, actor_identifier, actor_name, login_at, ip_address, user_agent, status, failure_reason, created_at',
      )
      .order('login_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new BadRequestException(`Gagal mengambil login log: ${error.message}`);
    }

    return {
      success: true,
      data: (data ?? []).map((item) => ({
        id: item.id,
        role: item.role,
        actorUserId: item.actor_user_id,
        actorIdentifier: item.actor_identifier,
        actorName: item.actor_name,
        loginAt: item.login_at,
        ipAddress: item.ip_address,
        userAgent: item.user_agent,
        status: item.status,
        failureReason: item.failure_reason,
        createdAt: item.created_at,
      })),
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

  private resolveActorUserId(role: string, user: any): string | null {
    if (role === UserRole.SISWA) {
      return user?.nis ?? null;
    }

    if (role === UserRole.GURU) {
      return user?.nip ?? null;
    }

    return user?.id != null ? String(user.id) : null;
  }

  private async recordLoginAudit(params: {
    role: string;
    identifier: string;
    displayName?: string | null;
    actorUserId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    status: 'success' | 'failed';
    failureReason?: string | null;
  }) {
    try {
      await this.supabaseService.createDocument('login_audit_log', {
        role: params.role,
        actor_user_id: params.actorUserId ?? null,
        actor_identifier: params.identifier,
        actor_name: params.displayName ?? null,
        login_at: new Date().toISOString(),
        ip_address: params.ipAddress ?? null,
        user_agent: params.userAgent ?? null,
        status: params.status,
        failure_reason: params.failureReason ?? null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthService] Gagal mencatat login audit:', error);
    }
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
      permissions?: string[];
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
    permissions?: string[];
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

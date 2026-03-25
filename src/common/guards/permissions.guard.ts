import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../enums/user-role.enum';
import { SupabaseService } from 'src/supabase/supabase.service';

type RequestUser = {
  sub?: string;
  role?: UserRole;
  permissions?: string[];
};

type SiswaPermissionRow = {
  permissions: string[] | null;
  is_active: boolean | null;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    // Pastikan user ada dan punya permissions
    if (!user) {
      return false;
    }

    // Role admin dan guru bypass semua permissions
    // Karena permissions array saat ini hanya didesain khusus untuk melimitasi fitur OSIS pda Siswa
    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.GURU ||
      user.role === UserRole.KANTIN
    ) {
      return true;
    }

    let userPermissions = user.permissions || [];

    // Untuk siswa, cek permission terbaru langsung ke database agar pencabutan akses
    // berlaku real-time tanpa menunggu token login lama habis.
    if (user.role === UserRole.SISWA && user.sub) {
      const supabase = this.supabaseService.getClient();
      const { data: siswaRow, error } = await supabase
        .from('siswa')
        .select('permissions, is_active')
        .eq('nis', user.sub)
        .maybeSingle<SiswaPermissionRow>();

      if (error) {
        throw new ForbiddenException('Gagal memverifikasi izin siswa');
      }

      if (!siswaRow || siswaRow.is_active === false) {
        throw new ForbiddenException(
          'Akun siswa tidak aktif atau tidak ditemukan',
        );
      }

      userPermissions = Array.isArray(siswaRow.permissions)
        ? siswaRow.permissions
        : [];
      user.permissions = userPermissions;
    }

    // Cek apakah user memiliki SALAH SATU permission yang dibutuhkan
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Akses ditolak. Anda tidak memiliki izin: ${requiredPermissions.join(' atau ')}`,
      );
    }

    return true;
  }
}

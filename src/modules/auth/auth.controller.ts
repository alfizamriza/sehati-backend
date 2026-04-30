import { Controller, Post, Body, Get, UseGuards, Req, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto, {
      ipAddress: this.getIpAddress(req),
      userAgent: req.get('user-agent') ?? null,
    });
    this.setAuthCookies(req, res, result?.data?.token, result?.data?.user?.role);
    return result;
  }

  @Public()
  @Post('register/admin')
  @ApiOperation({ summary: 'Register admin user' })
  @ApiResponse({ status: 201, description: 'Admin registered successfully' })
  async registerAdmin(@Body() registerAdminDto: RegisterAdminDto) {
    return this.authService.registerAdmin(registerAdminDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : req.cookies?.auth_token ?? null;
    this.clearAuthCookies(req, res);
    return this.authService.logout(token);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('login-logs')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get recent login audit logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Login logs retrieved successfully' })
  async getLoginLogs(@Query('limit') limit?: string) {
    const parsedLimit = Number(limit);
    return this.authService.getLoginLogs(
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }

  private getIpAddress(req: Request): string | null {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim() ?? null;
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0] ?? null;
    }

    return req.ip ?? req.socket.remoteAddress ?? null;
  }

  private setAuthCookies(req: Request, res: Response, token?: string, role?: string) {
    if (!token) return;

    const isSecure =
      req.secure ||
      req.get('x-forwarded-proto') === 'https' ||
      process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
    const baseOptions = {
      httpOnly: true,
      sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      secure: isSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    res.cookie('auth_token', token, baseOptions);
    res.cookie('auth_role', role ?? '', {
      ...baseOptions,
      httpOnly: false,
    });
  }

  private clearAuthCookies(req: Request, res: Response) {
    const isSecure =
      req.secure ||
      req.get('x-forwarded-proto') === 'https' ||
      process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
    const clearOptions = {
      sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      secure: isSecure,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    res.clearCookie('auth_token', {
      ...clearOptions,
      httpOnly: true,
    });
    res.clearCookie('auth_role', {
      ...clearOptions,
      httpOnly: false,
    });
  }
}

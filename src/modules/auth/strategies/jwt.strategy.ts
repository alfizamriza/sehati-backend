import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get('JWT_SECRET') || 'your-super-secret-key';
    
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.auth_token ?? this.getCookieFromHeader(req, 'auth_token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    
    console.log('🔒 JWT Strategy initialized with secret length:', secret.length);
  }

  async validate(payload: any) {
    console.log('✅ JWT Token validated:', { userId: payload.sub, role: payload.role });
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      ...(payload.peran && { peran: payload.peran }),
      ...(payload.permissions && { permissions: payload.permissions }),
    };
  }

  private getCookieFromHeader(req: Request | undefined, name: string): string | null {
    const rawCookie = req?.headers?.cookie;
    if (!rawCookie) return null;

    const match = rawCookie
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith(`${name}=`));

    if (!match) return null;

    const value = match.slice(name.length + 1);
    return value ? decodeURIComponent(value) : null;
  }
}

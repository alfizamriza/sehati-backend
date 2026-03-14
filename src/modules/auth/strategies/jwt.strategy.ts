import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get('JWT_SECRET') || 'your-super-secret-key';
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    };
  }
}
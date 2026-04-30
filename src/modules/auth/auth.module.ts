import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenRevocationService } from './token-revocation.service';
import { DatabaseModule } from '../../database/database.module';
import { AchievementModule } from '../achievement/achievement.module';

@Module({
  imports: [
    DatabaseModule,
    AchievementModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get('JWT_SECRET') || 'your-super-secret-key';
        const expiresIn = configService.get('JWT_EXPIRES_IN') || '7d';

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenRevocationService],
  exports: [AuthService],
})
export class AuthModule {}

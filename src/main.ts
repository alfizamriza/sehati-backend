import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';
  const isProduction = nodeEnv === 'production';

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins: string[] = [
        // Local development
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      // In production, also allow all Railway subdomains and any
      // domain listed in the ALLOWED_ORIGINS env variable.
      if (isProduction) {
        const envOrigins = configService.get<string>('app.allowedOrigins') || '';
        const extraOrigins = envOrigins
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
        allowedOrigins.push(...extraOrigins);
      }

      const isRailwayDomain = origin.endsWith('.railway.app');

      if (allowedOrigins.includes(origin) || isRailwayDomain) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Railway injects PORT automatically. Fall back to config or 3001 for local dev.
  const port = process.env.PORT || configService.get<number>('app.port') || 3001;

  // Swagger (useful in development; can be disabled in production via env)
  if (!isProduction || configService.get<boolean>('app.swaggerEnabled')) {
    const config = new DocumentBuilder()
      .setTitle('SEHATI API')
      .setDescription(
        [
          'API backend untuk Sistem Manajemen Sekolah Hijau dan Anti Plastik (SEHATI).',
          '',
          'Dokumentasi ini dirancang untuk memudahkan frontend developer, penguji API, dan integrator memahami endpoint yang tersedia beserta mekanisme autentikasinya.',
          '',
          'Modul utama yang tersedia mencakup autentikasi, master data, absensi, transaksi kantin, voucher, pelanggaran, leaderboard, dashboard, profil, riwayat, analytics, dan izin.',
          '',
          'Authentication:',
          'Sebagian endpoint menggunakan JWT Bearer Token. Gunakan tombol Authorize dan masukkan access token untuk mengakses endpoint yang dilindungi.',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'Bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addServer('https://shtbackend.up.railway.app', 'Production')
      .build();

    const swaggerOptions: SwaggerCustomOptions = {
      swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: true,
      },
    };

    SwaggerModule.setup(
      'api/docs',
      app,
      () => SwaggerModule.createDocument(app, config),
      swaggerOptions,
    );
  }

  await app.listen(port, '0.0.0.0');

  console.log(`\n✅ Server running on port ${port}`);
  console.log(`🔧 Environment:  ${nodeEnv}`);
  if (!isProduction) {
    console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as net from 'net';
import * as os from 'os';

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(startPort: number, maxTries = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxTries; port++) {
    if (await isPortAvailable(port)) return port;
    console.warn(`⚠️  Port ${port} already in use, trying ${port + 1}...`);
  }
  throw new Error(`No available port found in range ${startPort}–${startPort + maxTries - 1}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const localIP = getLocalIP();

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        `http://${localIP}:3000`,
        `http://${localIP}:3001`,
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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

  const preferredPort = configService.get<number>('app.port') || 3001;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  const port = await findAvailablePort(preferredPort);

  // Setup Swagger with dynamic port
  const config = new DocumentBuilder()
    .setTitle('Sehati API')
    .setDescription('API untuk Sistem Manajemen Sekolah Hijau')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'Bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addServer(`http://localhost:${port}`, 'Development (localhost)')
    .addServer(`http://${localIP}:${port}`, `Development (${localIP})`)
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  const swaggerOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
  };
  SwaggerModule.setup('api/docs', app, documentFactory, swaggerOptions);

  await app.listen(port, '0.0.0.0');

  console.log(`\n✅ Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`🌐 Network:      http://${localIP}:${port}`);
  console.log(`🔧 Environment:  ${nodeEnv}\n`);

  if (port !== preferredPort) {
    console.warn(`⚠️  Note: preferred port ${preferredPort} was busy, using ${port} instead.`);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
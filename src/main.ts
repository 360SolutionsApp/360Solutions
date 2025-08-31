import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:8100',
      'http://localhost',
      'https://localhost',
      'http://localhost:3000',
      'http://localhost:4200',
      'https://ingrubio.com',
      'https://17gqklpf-3000.use.devtunnels.ms',
      'capacitor://localhost',
      'http://192.168.1.13:8100',
    ], // O usa '*' para desarrollo (no recomendado para producción)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Bootstrap da aplicação NestJS.
 *
 * Configurações aplicadas:
 * - ValidationPipe global: valida DTOs automaticamente em todos os endpoints.
 * - Swagger: documentação interativa da API em /api/docs.
 * - Prefixo global /api para versionamento futuro.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Prefixo global para versionamento futuro da API
  app.setGlobalPrefix('api');

  // Configuração do Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Régua de Cobranças API')
    .setDescription(
      'API para gestão de faturas e agendamento automático de lembretes de cobrança. ' +
      'Módulo desenvolvido como parte do desafio técnico para Desenvolvedor Fullstack Pleno.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Insira o token JWT obtido via POST /api/auth/login',
      },
    )
    .addTag('Autenticação', 'Endpoints de autenticação e geração de tokens JWT')
    .addTag('Faturas', 'CRUD de faturas e régua de cobranças')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Aplicação rodando em http://localhost:${port}/api`);
  logger.log(`📚 Swagger disponível em http://localhost:${port}/api/docs`);
}

bootstrap();

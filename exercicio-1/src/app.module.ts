import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CobrancaModule } from './cobranca/cobranca.module';
import { AuthModule } from './auth/auth.module';
import { dataSourceOptions } from './data-source';

/**
 * Módulo raiz da aplicação.
 *
 * Módulos registrados:
 * - ConfigModule: carrega variáveis de ambiente do arquivo .env.
 * - TypeOrmModule: conexão com PostgreSQL via migrations.
 * - ScheduleModule: cron jobs para processamento de lembretes.
 * - ThrottlerModule: rate limiting global (100 req/min por IP).
 * - AuthModule: autenticação JWT via Passport.
 * - CobrancaModule: funcionalidade principal de faturas e lembretes.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      synchronize: false,
      migrationsRun: false,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requisições por minuto por IP
      },
    ]),
    AuthModule,
    CobrancaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

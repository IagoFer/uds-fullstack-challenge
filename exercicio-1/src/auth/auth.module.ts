import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Módulo de autenticação.
 *
 * Configura o Passport com estratégia JWT e o módulo de geração de tokens.
 * Exporta JwtStrategy para que o JwtAuthGuard funcione em outros módulos.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'uds-challenge-secret-key-2026',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}

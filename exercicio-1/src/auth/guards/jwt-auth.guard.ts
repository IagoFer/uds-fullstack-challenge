import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticação JWT.
 *
 * Estende o AuthGuard do Passport para a estratégia 'jwt'.
 * Quando aplicado a um controller ou rota, ele:
 * 1. Extrai o token Bearer do header Authorization
 * 2. Valida o token usando a JwtStrategy
 * 3. Injeta o payload decodificado em req.user
 * 4. Retorna 401 Unauthorized se o token for inválido ou ausente
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

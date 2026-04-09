import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Payload decodificado do token JWT.
 */
export interface JwtPayload {
  sub: string; // userId (padrão JWT: "sub" = subject)
  email: string;
}

/**
 * Estratégia JWT para validação de tokens.
 *
 * O Passport chama o método validate() após decodificar e verificar
 * a assinatura do token. O objeto retornado por validate() é injetado
 * em req.user, disponível em todos os controllers protegidos.
 *
 * Em produção, o secret viria de um serviço de segredos (AWS Secrets Manager,
 * Vault, etc.) e nunca estaria hardcoded ou em variável de ambiente
 * do código-fonte.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'uds-challenge-secret-key-2026',
    });
  }

  /**
   * Chamado automaticamente após o token ser verificado.
   * Retorna o objeto que será injetado em req.user.
   */
  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}

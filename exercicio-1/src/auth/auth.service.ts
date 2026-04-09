import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Serviço de autenticação.
 *
 * Em produção, este serviço validaria credenciais contra o banco
 * de dados (com hash bcrypt da senha). Aqui, gera um token JWT
 * válido a partir do userId e email fornecidos, para permitir
 * testes completos do fluxo de autenticação.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Gera um token JWT com o userId como "sub" (subject).
   *
   * O token expira em 1 hora por padrão (configurável via JWT_EXPIRES_IN).
   */
  async login(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Controller de autenticação.
 *
 * Expõe o endpoint de login para geração de tokens JWT.
 * Em produção, incluiríamos também endpoints de refresh token,
 * logout (blacklist de tokens) e registro de novos usuários.
 */
@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gerar token JWT',
    description:
      'Gera um token de acesso JWT para autenticação nos endpoints protegidos. ' +
      'Em produção, validaria credenciais contra o banco de dados.',
  })
  @ApiResponse({ status: 200, description: 'Token gerado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.userId, dto.email);
  }
}

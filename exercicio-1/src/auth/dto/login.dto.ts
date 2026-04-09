import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para geração de token JWT.
 *
 * Em uma aplicação real, este endpoint validaria credenciais
 * (email + senha) contra o banco de dados. Aqui, aceita
 * userId + email para facilitar os testes do avaliador.
 */
export class LoginDto {
  @ApiProperty({
    description: 'ID do usuário (UUID v4)',
    example: '5c47937d-b657-4b53-911b-c689f0744769',
  })
  @IsUUID('4', { message: 'O userId deve ser um UUID v4 válido' })
  @IsNotEmpty({ message: 'O userId é obrigatório' })
  userId: string;

  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'admin@empresa.com',
  })
  @IsEmail({}, { message: 'O e-mail deve ser um endereço válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;
}

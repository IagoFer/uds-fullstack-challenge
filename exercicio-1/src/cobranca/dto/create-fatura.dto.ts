import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para criação de fatura.
 *
 * Cada campo possui validação explícita via class-validator e
 * documentação via @ApiProperty para o Swagger.
 *
 * O `userId` NÃO está no DTO pois é extraído automaticamente
 * do token JWT via @CurrentUser() decorator no controller.
 * Isso garante isolamento multi-tenant: o usuário só pode
 * criar faturas associadas ao seu próprio ID.
 */
export class CreateFaturaDto {
  @ApiProperty({
    description: 'Descrição da fatura',
    example: 'Mensalidade Plano Pro - Abril/2026',
    maxLength: 255,
  })
  @IsString({ message: 'A descrição deve ser uma string' })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @MaxLength(255, { message: 'A descrição deve ter no máximo 255 caracteres' })
  descricao: string;

  @ApiProperty({
    description: 'Valor da fatura em reais (máximo 2 casas decimais)',
    example: 299.9,
    minimum: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O valor deve ser um número com no máximo 2 casas decimais' },
  )
  @Min(0.01, { message: 'O valor mínimo da fatura é R$ 0,01' })
  valor: number;

  @ApiProperty({
    description: 'Data de vencimento no formato ISO 8601 (YYYY-MM-DD)',
    example: '2026-04-20',
  })
  @IsDateString(
    {},
    { message: 'A data de vencimento deve estar no formato ISO 8601 (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'A data de vencimento é obrigatória' })
  dataVencimento: string;

  @ApiProperty({
    description: 'Nome completo do devedor',
    example: 'João Silva',
    maxLength: 150,
  })
  @IsString({ message: 'O nome do devedor deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do devedor é obrigatório' })
  @MaxLength(150, { message: 'O nome do devedor deve ter no máximo 150 caracteres' })
  devedorNome: string;

  @ApiProperty({
    description: 'E-mail do devedor (destino dos lembretes)',
    example: '[SEU EMAIL CADASTRADO NO RESEND]joao@empresa.com',
  })
  @IsEmail({}, { message: 'O e-mail do devedor deve ser um endereço válido' })
  @IsNotEmpty({ message: 'O e-mail do devedor é obrigatório' })
  devedorEmail: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * DTO de paginação para endpoints de listagem.
 *
 * Padrão offset-based (page + limit) por simplicidade.
 * Para datasets muito grandes ou scroll infinito,
 * cursor-based pagination seria mais eficiente.
 */
export class PaginacaoDto {
  @ApiPropertyOptional({
    description: 'Número da página (começa em 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro' })
  @Min(1, { message: 'A página mínima é 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro' })
  @Min(1, { message: 'O limite mínimo é 1' })
  @Max(100, { message: 'O limite máximo é 100 itens por página' })
  limit?: number = 10;
}

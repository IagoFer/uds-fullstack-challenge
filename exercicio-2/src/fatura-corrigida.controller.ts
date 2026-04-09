import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginacaoDto } from './dto/paginacao.dto';
import { Fatura } from './fatura.entity';

/**
 * CÓDIGO CORRIGIDO
 *
 * Correções aplicadas:
 * 1. Guard de autenticação (@UseGuards) garante que req.user SEMPRE existe
 * 2. Filtro feito no banco (WHERE) em vez de na memória (.filter)
 * 3. Paginação via skip/take evita carregar todos os registros
 * 4. Tipagem explícita no parâmetro do usuário via @CurrentUser()
 * 5. Resposta padronizada com metadados de paginação
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class FaturaCorrigidaController {
  private readonly logger = new Logger(FaturaCorrigidaController.name);

  constructor(
    @InjectRepository(Fatura)
    private readonly faturaRepo: Repository<Fatura>,
  ) {}

  @Get('/faturas')
  async listarFaturas(
    @CurrentUser() user: { id: string },
    @Query() paginacao: PaginacaoDto,
  ) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;

    const [items, total] = await this.faturaRepo.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

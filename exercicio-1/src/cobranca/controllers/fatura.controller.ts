import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ParseUUIDPipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { FaturaService } from '../services/fatura.service';
import { CreateFaturaDto } from '../dto/create-fatura.dto';
import { PaginacaoDto } from '../dto/paginacao.dto';

/**
 * Controller de Faturas — expõe os endpoints REST do módulo de cobrança.
 *
 * Todos os endpoints são protegidos por:
 * - JwtAuthGuard: exige token Bearer válido no header Authorization
 * - Throttler (rate limiting): protege contra abuso e ataques de força bruta
 *
 * O userId é extraído automaticamente do token JWT via @CurrentUser(),
 * garantindo isolamento multi-tenant sem depender do payload do client.
 */
@ApiTags('Faturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('faturas')
export class FaturaController {
  private readonly logger = new Logger(FaturaController.name);

  constructor(private readonly faturaService: FaturaService) {}

  /**
   * Cria uma nova fatura e agenda automaticamente os 3 lembretes
   * da régua de cobrança (D-3, D+1, D+7).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Criar fatura e agendar lembretes',
    description:
      'Cria uma nova fatura e agenda automaticamente 3 lembretes de cobrança: ' +
      'D-3 (3 dias antes do vencimento), D+1 (1 dia após) e D+7 (7 dias após). ' +
      'O userId é extraído automaticamente do token JWT.',
  })
  @ApiResponse({
    status: 201,
    description: 'Fatura criada com sucesso e lembretes agendados',
  })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async criarFatura(
    @Body() dto: CreateFaturaDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    this.logger.log(`Criando fatura para ${dto.devedorEmail} (user: ${user.id})...`);
    const fatura = await this.faturaService.criarFatura(dto, user.id);
    return {
      message: 'Fatura criada com sucesso. Lembretes agendados.',
      data: fatura,
    };
  }

  /**
   * Busca uma fatura pelo ID, incluindo seus lembretes agendados.
   * Retorna apenas faturas do usuário autenticado.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar fatura por ID',
    description: 'Retorna os detalhes de uma fatura e seus lembretes agendados.',
  })
  @ApiResponse({ status: 200, description: 'Fatura encontrada' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido' })
  @ApiResponse({ status: 404, description: 'Fatura não encontrada' })
  async buscarPorId(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: { id: string },
  ) {
    const fatura = await this.faturaService.buscarPorIdEUsuario(id, user.id);

    if (!fatura) {
      throw new NotFoundException(`Fatura com ID ${id} não encontrada.`);
    }

    return { data: fatura };
  }

  /**
   * Lista as faturas do usuário autenticado com paginação.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar minhas faturas',
    description:
      'Lista as faturas do usuário autenticado com paginação, ordenadas por data de criação.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de faturas do usuário' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido' })
  async listarMinhasFaturas(
    @CurrentUser() user: { id: string },
    @Query() paginacao: PaginacaoDto,
  ) {
    const resultado = await this.faturaService.listarPorUsuario(
      user.id,
      paginacao.page,
      paginacao.limit,
    );
    return {
      data: resultado.items,
      meta: {
        total: resultado.total,
        page: resultado.page,
        limit: resultado.limit,
        totalPages: Math.ceil(resultado.total / resultado.limit),
      },
    };
  }
}

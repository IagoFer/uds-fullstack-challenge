import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Fatura } from '../entities/fatura.entity';
import { CreateFaturaDto } from '../dto/create-fatura.dto';
import { LembreteService } from './lembrete.service';

/**
 * Serviço responsável pela criação e consulta de faturas.
 *
 * A criação de fatura + lembretes é feita dentro de uma transação
 * para garantir atomicidade: ou a fatura E seus lembretes são
 * persistidos, ou nenhum dos dois é.
 */
@Injectable()
export class FaturaService {
  private readonly logger = new Logger(FaturaService.name);

  constructor(
    @InjectRepository(Fatura)
    private readonly faturaRepo: Repository<Fatura>,
    private readonly lembreteService: LembreteService,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Cria uma fatura e seus 3 lembretes da régua de cobrança em uma transação atômica.
   *
   * Por que usar transação aqui:
   * - Se a criação de algum lembrete falhar como constraint violada,
   *   a fatura também é revertida. Não queremos fatura sem lembretes
   *   nem lembretes sem fatura.
   * - QueryRunner do TypeORM permite controle fino do ciclo de vida
   *   da transação.
   */
  async criarFatura(dto: CreateFaturaDto, userId: string): Promise<Fatura> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Criar a entidade Fatura
      const fatura = this.faturaRepo.create({
        descricao: dto.descricao,
        valor: dto.valor,
        dataVencimento: dto.dataVencimento,
        devedorNome: dto.devedorNome,
        devedorEmail: dto.devedorEmail,
        userId,
      });

      const faturaSalva = await queryRunner.manager.save(fatura);

      this.logger.log(
        `Fatura criada: ${faturaSalva.id} (vencimento: ${faturaSalva.dataVencimento})`,
      );

      // 2. Criar os 3 lembretes da régua de cobrança
      const lembretes = this.lembreteService.criarLembretesParaFatura(
        faturaSalva.id,
        dto.dataVencimento,
      );

      const lembretesSalvos = await queryRunner.manager.save(lembretes);

      // 3. Commit da transação
      await queryRunner.commitTransaction();

      this.logger.log(
        `${lembretesSalvos.length} lembretes agendados para fatura ${faturaSalva.id}`,
      );

      // Retorna a fatura com os lembretes incluídos
      faturaSalva.lembretes = lembretesSalvos;
      return faturaSalva;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Erro ao criar fatura — transação revertida: ${error instanceof Error ? error.message : String(error)
        }`,
      );

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Busca uma fatura pelo ID e userId, com seus lembretes.
   *
   * Filtra por userId para garantir isolamento multi-tenant:
   * um usuário nunca consegue acessar a fatura de outro.
   */
  async buscarPorIdEUsuario(
    id: string,
    userId: string,
  ): Promise<Fatura | null> {
    return this.faturaRepo.findOne({
      where: { id, userId },
      relations: ['lembretes'],
    });
  }

  /**
   * Lista faturas de um usuário com paginação.
   *
   * Filtramos diretamente no banco via WHERE clause.
   * A paginação evita carregar todas as faturas na memória.
   */
  async listarPorUsuario(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: Fatura[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.faturaRepo.findAndCount({
      where: { userId },
      relations: ['lembretes'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}

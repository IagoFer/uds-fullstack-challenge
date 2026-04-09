import { Controller, Get, Req } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Fatura } from './fatura.entity';

/**
 * CÓDIGO LEGADO (PROBLEMÁTICO)
 *
 * Este arquivo contém o código original encontrado em produção.
 * Ele está aqui apenas para referência e comparação.
 * A versão corrigida está em fatura-corrigida.controller.ts.
 */
@Controller()
export class FaturaLegadoController {
  constructor(
    @InjectRepository(Fatura)
    private readonly faturaRepo: Repository<Fatura>,
  ) {}

  @Get('/faturas')
  async listarFaturas(@Req() req) {
    const todas = await this.faturaRepo.find();
    const userId = req.user?.id;
    const filtradas = todas.filter(f => f.userId === userId);
    return filtradas;
  }
}

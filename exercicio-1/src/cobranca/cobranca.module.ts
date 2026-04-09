import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fatura } from './entities/fatura.entity';
import { LembreteAgendado } from './entities/lembrete-agendado.entity';
import { FaturaController } from './controllers/fatura.controller';
import { FaturaService } from './services/fatura.service';
import { LembreteService } from './services/lembrete.service';
import { LembreteSchedulerService } from './services/lembrete-scheduler.service';
import { EmailService } from './services/email.service';

/**
 * CobrancaModule — módulo principal da régua de cobranças.
 *
 * Encapsula toda a funcionalidade de criação de faturas e
 * agendamento/processamento de lembretes.
 *
 * Estrutura:
 * - Entities: Fatura, LembreteAgendado (registradas no TypeORM)
 * - Controller: FaturaController (endpoints REST)
 * - Services:
 *   - FaturaService: CRUD de faturas
 *   - LembreteService: criação e gestão de lembretes
 *   - LembreteSchedulerService: cron job de processamento
 *   - EmailService: envio de e-mails
 */
@Module({
  imports: [TypeOrmModule.forFeature([Fatura, LembreteAgendado])],
  controllers: [FaturaController],
  providers: [
    FaturaService,
    LembreteService,
    LembreteSchedulerService,
    EmailService,
  ],
  exports: [FaturaService],
})
export class CobrancaModule { }

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { StatusFatura } from '../enums';
import type { LembreteAgendado } from './lembrete-agendado.entity';

/**
 * Entidade Fatura — representa uma cobrança emitida para um devedor.
 *
 * Decisões de modelagem:
 * - `id` UUID: evita IDs sequenciais previsíveis, mais seguro em APIs REST.
 * - `valor` decimal(12,2): precisão financeira sem erros de floating-point.
 *   12 dígitos totais comportam valores até 9.999.999.999,99.
 * - `dataVencimento` date (sem hora): a régua de cobrança trabalha com dias,
 *   não com horário exato. O campo é uma data pura.
 * - `devedorEmail`: destino dos lembretes; validado no DTO via class-validator.
 * - `userId` UUID: garante isolamento multi-tenant — cada fatura pertence
 *   ao usuário que a criou. Em produção, viria do token JWT.
 * - `status` enum: controle explícito do ciclo de vida da fatura.
 *   Permite filtrar facilmente faturas pendentes, pagas, etc.
 * - Timestamps automáticos: essenciais para auditoria e debugging.
 */
@Entity('fatura')
export class Fatura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'date', name: 'data_vencimento' })
  dataVencimento: string;

  @Column({ type: 'varchar', length: 150, name: 'devedor_nome' })
  devedorNome: string;

  @Column({ type: 'varchar', length: 255, name: 'devedor_email' })
  devedorEmail: string;

  @Column({
    type: 'enum',
    enum: StatusFatura,
    default: StatusFatura.PENDENTE,
  })
  status: StatusFatura;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => {
      const { LembreteAgendado } = require('./lembrete-agendado.entity');
      return LembreteAgendado;
    },
    (lembrete: LembreteAgendado) => lembrete.fatura,
    {
      cascade: true,
      eager: false,
    },
  )
  lembretes: LembreteAgendado[];
}

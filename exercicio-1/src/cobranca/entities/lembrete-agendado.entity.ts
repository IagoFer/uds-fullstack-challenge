import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StatusLembrete, TipoLembrete } from '../enums';
import { Fatura } from './fatura.entity';

/**
 * Entidade LembreteAgendado — representa um lembrete programado
 * para ser enviado ao devedor de uma fatura.
 *
 * Decisões de modelagem:
 * - `tipo` enum (D-3, D+1, D+7): identifica de maneira precisa qual lembrete
 *   da régua este registro representa. Facilita queries e debugging.
 * - `dataEnvio` timestamp: momento calculado a partir do vencimento da fatura.
 *   Usado pelo scheduler para decidir quais lembretes processar.
 * - `tentativas` int com default 0: permite controle de retry com limite,
 *   evitando loops infinitos em caso de falha persistente do serviço de e-mail.
 * - `erro` text nullable: armazena a última mensagem de erro, essencial
 *   para debugging sem precisar consultar logs de infraestrutura.
 */
@Entity('lembrete_agendado')
export class LembreteAgendado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'fatura_id' })
  faturaId: string;

  @Column({
    type: 'enum',
    enum: TipoLembrete,
  })
  tipo: TipoLembrete;

  @Column({ type: 'timestamp', name: 'data_envio' })
  dataEnvio: Date;

  @Column({
    type: 'enum',
    enum: StatusLembrete,
    default: StatusLembrete.PENDENTE,
  })
  status: StatusLembrete;

  @Column({ type: 'int', default: 0 })
  tentativas: number;

  @Column({ type: 'text', nullable: true })
  erro: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Fatura, (fatura) => fatura.lembretes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fatura_id' })
  fatura: Fatura;
}

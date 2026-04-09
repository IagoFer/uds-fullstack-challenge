/**
 * Enums do módulo de cobrança.
 *
 * Centralizados aqui para evitar dependências circulares
 * e facilitar reutilização em entities, DTOs e services.
 */

export enum StatusFatura {
  PENDENTE = 'pendente',
  PAGA = 'paga',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
}

export enum StatusLembrete {
  PENDENTE = 'pendente',
  ENVIADO = 'enviado',
  FALHOU = 'falhou',
}

export enum TipoLembrete {
  D_MENOS_3 = 'D-3',
  D_MAIS_1 = 'D+1',
  D_MAIS_7 = 'D+7',
}

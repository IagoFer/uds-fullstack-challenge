import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLembreteAgendado1775761136979 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "status_lembrete_enum" AS ENUM (
        'pendente', 'enviado', 'falhou'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tipo_lembrete_enum" AS ENUM (
        'D-3', 'D+1', 'D+7'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "lembrete_agendado" (
        "id"          UUID DEFAULT gen_random_uuid() NOT NULL,
        "fatura_id"   UUID                    NOT NULL,
        "tipo"        "tipo_lembrete_enum"    NOT NULL,
        "data_envio"  TIMESTAMP               NOT NULL,
        "status"      "status_lembrete_enum"  NOT NULL DEFAULT 'pendente',
        "tentativas"  INTEGER                 NOT NULL DEFAULT 0,
        "erro"        TEXT,
        "created_at"  TIMESTAMP               NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP               NOT NULL DEFAULT now(),

        CONSTRAINT "PK_lembrete_agendado" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lembrete_fatura" FOREIGN KEY ("fatura_id")
          REFERENCES "fatura"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lembrete_status_data_envio"
        ON "lembrete_agendado" ("status", "data_envio")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_lembrete_status_data_envio"`);
    await queryRunner.query(`DROP TABLE "lembrete_agendado"`);
    await queryRunner.query(`DROP TYPE "tipo_lembrete_enum"`);
    await queryRunner.query(`DROP TYPE "status_lembrete_enum"`);
  }
}


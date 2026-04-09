import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFatura1775761121550 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "status_fatura_enum" AS ENUM (
        'pendente', 'paga', 'vencida', 'cancelada'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fatura" (
        "id"              UUID DEFAULT gen_random_uuid() NOT NULL,
        "descricao"       VARCHAR(255)          NOT NULL,
        "valor"           DECIMAL(12, 2)        NOT NULL,
        "data_vencimento" DATE                  NOT NULL,
        "devedor_nome"    VARCHAR(150)          NOT NULL,
        "devedor_email"   VARCHAR(255)          NOT NULL,
        "status"          "status_fatura_enum"  NOT NULL DEFAULT 'pendente',
        "user_id"         UUID                  NOT NULL,
        "created_at"      TIMESTAMP             NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP             NOT NULL DEFAULT now(),

        CONSTRAINT "PK_fatura" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fatura_user_id" ON "fatura" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fatura_status" ON "fatura" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_fatura_status"`);
    await queryRunner.query(`DROP INDEX "IDX_fatura_user_id"`);
    await queryRunner.query(`DROP TABLE "fatura"`);
    await queryRunner.query(`DROP TYPE "status_fatura_enum"`);
  }
}


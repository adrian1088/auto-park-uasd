import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketRateSnapshot1790546000000 implements MigrationInterface {
  name = 'TicketRateSnapshot1790546000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD "rate_amount" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "tickets" ticket SET "rate_amount" = rate."amount" FROM "rates" rate WHERE ticket."rate_id" = rate."id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "rate_amount"`);
  }
}
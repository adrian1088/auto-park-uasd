import { MigrationInterface, QueryRunner } from "typeorm";

export class NewChange1792355973059 implements MigrationInterface {
    name = 'NewChange1792355973059'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD "transaction_reference" character varying(100)`);
        await queryRunner.query(`COMMENT ON COLUMN "payments"."transaction_reference" IS 'Transaction reference for the payment'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "payment_date" SET DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "payment_date" DROP DEFAULT`);
        await queryRunner.query(`COMMENT ON COLUMN "payments"."transaction_reference" IS 'Transaction reference for the payment'`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "transaction_reference"`);
    }

}

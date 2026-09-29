import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldJose1790644736811 implements MigrationInterface {
    name = 'AddFieldJose1790644736811'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parking_lots" ADD "jose" character varying(60) NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "parking_lots"."jose" IS 'Jose field'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "parking_lots"."jose" IS 'Jose field'`);
        await queryRunner.query(`ALTER TABLE "parking_lots" DROP COLUMN "jose"`);
    }

}

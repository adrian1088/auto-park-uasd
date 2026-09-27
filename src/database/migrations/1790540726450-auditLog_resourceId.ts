import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditLogResourceId1790540726450 implements MigrationInterface {
    name = 'AuditLogResourceId1790540726450'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "resource_id"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "resource_id" character varying(255)`);
        await queryRunner.query(`COMMENT ON COLUMN "audit_logs"."resource_id" IS 'ID of the entity on which the action was performed'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "audit_logs"."resource_id" IS 'ID of the entity on which the action was performed'`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "resource_id"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "resource_id" integer`);
    }

}

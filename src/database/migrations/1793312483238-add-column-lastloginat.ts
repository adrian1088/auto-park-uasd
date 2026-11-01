import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnLastloginat1793312483238 implements MigrationInterface {
    name = 'AddColumnLastloginat1793312483238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "last_login" TO "last_login_at"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "last_login_at" TO "last_login"`);
    }

}

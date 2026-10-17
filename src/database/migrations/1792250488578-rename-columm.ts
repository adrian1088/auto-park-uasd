import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameColumm1792250488578 implements MigrationInterface {
    name = 'RenameColumm1792250488578'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parking_floors" DROP CONSTRAINT "fk_parking_floors_parking_lot_id_parking_lots_id"`);
        await queryRunner.query(`ALTER TABLE "parking_floors" RENAME COLUMN "parking_lot_id" TO "lot_id"`);
        await queryRunner.query(`ALTER TYPE "public"."users_status_enum" ADD VALUE 'pending'`);
        await queryRunner.query(`ALTER TABLE "parking_floors" ADD CONSTRAINT "fk_parking_floors_lot_id_parking_lots_id" FOREIGN KEY ("lot_id") REFERENCES "parking_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parking_floors" DROP CONSTRAINT "fk_parking_floors_lot_id_parking_lots_id"`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum_old" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum_old" USING "status"::"text"::"public"."users_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_status_enum_old" RENAME TO "users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "parking_floors" RENAME COLUMN "lot_id" TO "parking_lot_id"`);
        await queryRunner.query(`ALTER TABLE "parking_floors" ADD CONSTRAINT "fk_parking_floors_parking_lot_id_parking_lots_id" FOREIGN KEY ("parking_lot_id") REFERENCES "parking_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

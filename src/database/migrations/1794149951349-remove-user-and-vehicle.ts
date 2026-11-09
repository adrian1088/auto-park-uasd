import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserAndVehicle1794149951349 implements MigrationInterface {
    name = 'RemoveUserAndVehicle1794149951349'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_vehicle_id_vehicles_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_vehicle_id_vehicles_id"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "fk_vehicles_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" RENAME COLUMN "vehicle_id" TO "vehicle_plate_number"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "vehicle_id"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "vehicle_plate_number" character varying(20)`);
        await queryRunner.query(`COMMENT ON COLUMN "reservations"."vehicle_plate_number" IS 'Vehicle ID'`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "fk_payments_user_id_users_id"`);
        await queryRunner.query(`COMMENT ON COLUMN "payments"."user_id" IS 'User ID associated with the payment'`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_user_id_users_id"`);
        await queryRunner.query(`COMMENT ON COLUMN "tickets"."user_id" IS 'User ID'`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "vehicle_plate_number"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "vehicle_plate_number" character varying(20) NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "tickets"."vehicle_plate_number" IS 'Vehicle plate number'`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_parking_space_id_parking_spaces_id"`);
        await queryRunner.query(`COMMENT ON COLUMN "reservations"."user_id" IS 'User ID'`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "parking_space_id" SET NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reservations"."parking_space_id" IS 'Parking space ID'`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_parking_space_id_parking_spaces_id" FOREIGN KEY ("parking_space_id") REFERENCES "parking_spaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_parking_space_id_parking_spaces_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "fk_payments_user_id_users_id"`);
        await queryRunner.query(`COMMENT ON COLUMN "reservations"."parking_space_id" IS 'Primary key'`);
        await queryRunner.query(`ALTER TABLE "reservations" ALTER COLUMN "parking_space_id" DROP NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reservations"."user_id" IS 'Primary key'`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_parking_space_id_parking_spaces_id" FOREIGN KEY ("parking_space_id") REFERENCES "parking_spaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`COMMENT ON COLUMN "tickets"."vehicle_plate_number" IS 'Vehicle plate number'`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "vehicle_plate_number"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "vehicle_plate_number" bigint`);
        await queryRunner.query(`COMMENT ON COLUMN "tickets"."user_id" IS 'Primary key'`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`COMMENT ON COLUMN "payments"."user_id" IS 'Primary key'`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`COMMENT ON COLUMN "reservations"."vehicle_plate_number" IS 'Vehicle ID'`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "vehicle_plate_number"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD "user_id" bigint`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD "vehicle_id" bigint`);
        await queryRunner.query(`ALTER TABLE "tickets" RENAME COLUMN "vehicle_plate_number" TO "vehicle_id"`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "fk_vehicles_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_vehicle_id_vehicles_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_vehicle_id_vehicles_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

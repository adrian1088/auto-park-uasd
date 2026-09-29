import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1790644382890 implements MigrationInterface {
    name = 'Init1790644382890'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."rates_type_enum" AS ENUM('HOURLY', 'DAILY', 'MONTHLY')`);
        await queryRunner.query(`CREATE TABLE "rates" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."rates_type_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "valid_from" TIMESTAMP NOT NULL, "valid_to" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "parking_lot_id" bigint NOT NULL, CONSTRAINT "pk_rates_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "rates"."id" IS 'Primary key'; COMMENT ON COLUMN "rates"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "rates"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "rates"."type" IS 'Rate billing period'; COMMENT ON COLUMN "rates"."amount" IS 'Rate amount'; COMMENT ON COLUMN "rates"."valid_from" IS 'Start of rate validity'; COMMENT ON COLUMN "rates"."valid_to" IS 'End of rate validity'; COMMENT ON COLUMN "rates"."is_active" IS 'Whether the rate can be used'; COMMENT ON COLUMN "rates"."parking_lot_id" IS 'Primary key'`);
        await queryRunner.query(`CREATE INDEX "idx_rates_lookup" ON "rates"  ("parking_lot_id", "type", "valid_from", "valid_to") `);
        await queryRunner.query(`COMMENT ON TABLE "rates" IS 'Historical parking rates'`);
        await queryRunner.query(`CREATE TABLE "parking_lots" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "address" character varying(255) NOT NULL, "capacity" integer NOT NULL, CONSTRAINT "pk_parking_lots_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "parking_lots"."id" IS 'Primary key'; COMMENT ON COLUMN "parking_lots"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "parking_lots"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "parking_lots"."name" IS 'Name of the parking lot'; COMMENT ON COLUMN "parking_lots"."address" IS 'Address of the parking lot'; COMMENT ON COLUMN "parking_lots"."capacity" IS 'Capacity of the parking lot'`);
        await queryRunner.query(`COMMENT ON TABLE "parking_lots" IS 'Parking lots table'`);
        await queryRunner.query(`CREATE TYPE "public"."parking_floors_status_enum" AS ENUM('OPEN', 'FULL')`);
        await queryRunner.query(`CREATE TABLE "parking_floors" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "floor_number" integer NOT NULL, "status" "public"."parking_floors_status_enum" NOT NULL, "parking_lot_id" bigint, CONSTRAINT "pk_parking_floors_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "parking_floors"."id" IS 'Primary key'; COMMENT ON COLUMN "parking_floors"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "parking_floors"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "parking_floors"."floor_number" IS 'Floor number of the parking'; COMMENT ON COLUMN "parking_floors"."status" IS 'Status of the parking floor'; COMMENT ON COLUMN "parking_floors"."parking_lot_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "parking_floors" IS 'Parking floors table'`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "start_time" TIMESTAMP NOT NULL, "end_time" TIMESTAMP NOT NULL, "user_id" bigint, "parking_space_id" bigint, "vehicle_id" bigint, CONSTRAINT "pk_reservations_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "reservations"."id" IS 'Primary key'; COMMENT ON COLUMN "reservations"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "reservations"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "reservations"."start_time" IS 'Start time of the reservation'; COMMENT ON COLUMN "reservations"."end_time" IS 'End time of the reservation'; COMMENT ON COLUMN "reservations"."user_id" IS 'Primary key'; COMMENT ON COLUMN "reservations"."parking_space_id" IS 'Primary key'; COMMENT ON COLUMN "reservations"."vehicle_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "reservations" IS 'Reservations table'`);
        await queryRunner.query(`CREATE TYPE "public"."parking_spaces_type_enum" AS ENUM('CAR', 'TRUCK', 'MOTORCYCLE', 'VAN', 'BUS', 'SUV', 'PICKUP')`);
        await queryRunner.query(`CREATE TYPE "public"."parking_spaces_status_enum" AS ENUM('FREE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE')`);
        await queryRunner.query(`CREATE TABLE "parking_spaces" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "space_number" character varying(10) NOT NULL, "type" "public"."parking_spaces_type_enum" NOT NULL, "status" "public"."parking_spaces_status_enum" NOT NULL, "floor_id" bigint, CONSTRAINT "uq_parking_spaces_space_number_floor_id" UNIQUE ("space_number", "floor_id"), CONSTRAINT "pk_parking_spaces_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "parking_spaces"."id" IS 'Primary key'; COMMENT ON COLUMN "parking_spaces"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "parking_spaces"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "parking_spaces"."space_number" IS 'Number of the parking space'; COMMENT ON COLUMN "parking_spaces"."type" IS 'Type of the parking space'; COMMENT ON COLUMN "parking_spaces"."status" IS 'Status of the parking space'; COMMENT ON COLUMN "parking_spaces"."floor_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "parking_spaces" IS 'Parking spaces table'`);
        await queryRunner.query(`CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "amount" numeric(10,2) NOT NULL, "payment_date" TIMESTAMP NOT NULL, "payment_method" "public"."payments_payment_method_enum" NOT NULL, "user_id" bigint, "ticket_id" bigint, CONSTRAINT "rel_payments_ticket_id" UNIQUE ("ticket_id"), CONSTRAINT "pk_payments_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "payments"."id" IS 'Primary key'; COMMENT ON COLUMN "payments"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "payments"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "payments"."amount" IS 'Payment amount'; COMMENT ON COLUMN "payments"."payment_date" IS 'Payment date'; COMMENT ON COLUMN "payments"."payment_method" IS 'Payment method'; COMMENT ON COLUMN "payments"."user_id" IS 'Primary key'; COMMENT ON COLUMN "payments"."ticket_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "payments" IS 'Payments table'`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('ACTIVE', 'PAID')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "entrance_at" TIMESTAMP NOT NULL DEFAULT now(), "exit_at" TIMESTAMP, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'ACTIVE', "amount" numeric(10,2) NOT NULL, "rate_amount" numeric(10,2) NOT NULL DEFAULT '0', "vehicle_id" bigint, "user_id" bigint, "spot_id" bigint, "reservation_id" bigint, "rate_id" bigint, CONSTRAINT "rel_tickets_reservation_id" UNIQUE ("reservation_id"), CONSTRAINT "pk_tickets_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "tickets"."id" IS 'Primary key'; COMMENT ON COLUMN "tickets"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "tickets"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "tickets"."entrance_at" IS 'Check-in time'; COMMENT ON COLUMN "tickets"."exit_at" IS 'Exit time'; COMMENT ON COLUMN "tickets"."status" IS 'Ticket status'; COMMENT ON COLUMN "tickets"."amount" IS 'Ticket amount'; COMMENT ON COLUMN "tickets"."rate_amount" IS 'Hourly rate snapshot captured at check-in'; COMMENT ON COLUMN "tickets"."vehicle_id" IS 'Primary key'; COMMENT ON COLUMN "tickets"."user_id" IS 'Primary key'; COMMENT ON COLUMN "tickets"."spot_id" IS 'Primary key'; COMMENT ON COLUMN "tickets"."reservation_id" IS 'Primary key'; COMMENT ON COLUMN "tickets"."rate_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "tickets" IS 'Tickets table'`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_type_enum" AS ENUM('CAR', 'TRUCK', 'MOTORCYCLE', 'VAN', 'BUS', 'SUV', 'PICKUP')`);
        await queryRunner.query(`CREATE TABLE "vehicles" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "plate_number" character varying(20) NOT NULL, "make" character varying(255) NOT NULL, "model" character varying(255) NOT NULL, "color" character varying(30) NOT NULL, "type" "public"."vehicles_type_enum" NOT NULL, "owner_name" character varying(255) NOT NULL, "user_id" bigint, CONSTRAINT "pk_vehicles_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "vehicles"."id" IS 'Primary key'; COMMENT ON COLUMN "vehicles"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "vehicles"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "vehicles"."plate_number" IS 'Plate number of the vehicle'; COMMENT ON COLUMN "vehicles"."make" IS 'Make of the vehicle'; COMMENT ON COLUMN "vehicles"."model" IS 'Model of the vehicle'; COMMENT ON COLUMN "vehicles"."color" IS 'Color of the vehicle'; COMMENT ON COLUMN "vehicles"."type" IS 'Type of the vehicle'; COMMENT ON COLUMN "vehicles"."owner_name" IS 'Owner name of the vehicle'; COMMENT ON COLUMN "vehicles"."user_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "vehicles" IS 'Vehicles table'`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "phone" character varying(255) NOT NULL, CONSTRAINT "pk_users_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "users"."id" IS 'Primary key'; COMMENT ON COLUMN "users"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "users"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "users"."name" IS 'User name'; COMMENT ON COLUMN "users"."email" IS 'User email'; COMMENT ON COLUMN "users"."password" IS 'User password'; COMMENT ON COLUMN "users"."role" IS 'User role'; COMMENT ON COLUMN "users"."status" IS 'User status'; COMMENT ON COLUMN "users"."phone" IS 'Phone number'`);
        await queryRunner.query(`COMMENT ON TABLE "users" IS 'Users table storing user information'`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "action" character varying(255) NOT NULL, "resource" character varying(255), "resource_id" character varying(255), "payload" jsonb, "status" character varying(20) NOT NULL DEFAULT 'SUCCESS', "error_message" text, "user_id" bigint, CONSTRAINT "pk_audit_logs_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "audit_logs"."id" IS 'Primary key'; COMMENT ON COLUMN "audit_logs"."created_at" IS 'Creation timestamp'; COMMENT ON COLUMN "audit_logs"."updated_at" IS 'Last update timestamp'; COMMENT ON COLUMN "audit_logs"."action" IS 'Description of the action performed e.g. POST /users, GET /products'; COMMENT ON COLUMN "audit_logs"."resource" IS 'Resource on which the action was performed e.g. User, Product, Order'; COMMENT ON COLUMN "audit_logs"."resource_id" IS 'ID of the entity on which the action was performed'; COMMENT ON COLUMN "audit_logs"."payload" IS 'Payload associated with the action'; COMMENT ON COLUMN "audit_logs"."status" IS 'Status of the action'; COMMENT ON COLUMN "audit_logs"."error_message" IS 'Error message if the action failed'; COMMENT ON COLUMN "audit_logs"."user_id" IS 'Primary key'`);
        await queryRunner.query(`COMMENT ON TABLE "audit_logs" IS 'Audit Log Entity'`);
        await queryRunner.query(`ALTER TABLE "rates" ADD CONSTRAINT "fk_rates_parking_lot_id_parking_lots_id" FOREIGN KEY ("parking_lot_id") REFERENCES "parking_lots"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parking_floors" ADD CONSTRAINT "fk_parking_floors_parking_lot_id_parking_lots_id" FOREIGN KEY ("parking_lot_id") REFERENCES "parking_lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_parking_space_id_parking_spaces_id" FOREIGN KEY ("parking_space_id") REFERENCES "parking_spaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_vehicle_id_vehicles_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parking_spaces" ADD CONSTRAINT "fk_parking_spaces_floor_id_parking_floors_id" FOREIGN KEY ("floor_id") REFERENCES "parking_floors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_ticket_id_tickets_id" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_vehicle_id_vehicles_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_spot_id_parking_spaces_id" FOREIGN KEY ("spot_id") REFERENCES "parking_spaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_reservation_id_reservations_id" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_rate_id_rates_id" FOREIGN KEY ("rate_id") REFERENCES "rates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "fk_vehicles_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user_id_users_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "fk_audit_logs_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "fk_vehicles_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_rate_id_rates_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_reservation_id_reservations_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_spot_id_parking_spaces_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "fk_tickets_vehicle_id_vehicles_id"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "fk_payments_ticket_id_tickets_id"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "fk_payments_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "parking_spaces" DROP CONSTRAINT "fk_parking_spaces_floor_id_parking_floors_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_vehicle_id_vehicles_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_parking_space_id_parking_spaces_id"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_user_id_users_id"`);
        await queryRunner.query(`ALTER TABLE "parking_floors" DROP CONSTRAINT "fk_parking_floors_parking_lot_id_parking_lots_id"`);
        await queryRunner.query(`ALTER TABLE "rates" DROP CONSTRAINT "fk_rates_parking_lot_id_parking_lots_id"`);
        await queryRunner.query(`COMMENT ON TABLE "audit_logs" IS NULL`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`COMMENT ON TABLE "users" IS NULL`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`COMMENT ON TABLE "vehicles" IS NULL`);
        await queryRunner.query(`DROP TABLE "vehicles"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_type_enum"`);
        await queryRunner.query(`COMMENT ON TABLE "tickets" IS NULL`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`COMMENT ON TABLE "payments" IS NULL`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_payment_method_enum"`);
        await queryRunner.query(`COMMENT ON TABLE "parking_spaces" IS NULL`);
        await queryRunner.query(`DROP TABLE "parking_spaces"`);
        await queryRunner.query(`DROP TYPE "public"."parking_spaces_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."parking_spaces_type_enum"`);
        await queryRunner.query(`COMMENT ON TABLE "reservations" IS NULL`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`COMMENT ON TABLE "parking_floors" IS NULL`);
        await queryRunner.query(`DROP TABLE "parking_floors"`);
        await queryRunner.query(`DROP TYPE "public"."parking_floors_status_enum"`);
        await queryRunner.query(`COMMENT ON TABLE "parking_lots" IS NULL`);
        await queryRunner.query(`DROP TABLE "parking_lots"`);
        await queryRunner.query(`COMMENT ON TABLE "rates" IS NULL`);
        await queryRunner.query(`DROP INDEX "public"."idx_rates_lookup"`);
        await queryRunner.query(`DROP TABLE "rates"`);
        await queryRunner.query(`DROP TYPE "public"."rates_type_enum"`);
    }

}

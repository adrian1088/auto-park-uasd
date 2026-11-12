import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQrAndEmailColumns1792562000000 implements MigrationInterface {
    name = 'AddQrAndEmailColumns1792562000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Modificar Subscriptions: Hacer plate_numbers opcional y agregar qrCode, emailSent
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "plate_numbers" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "qr_code" character varying`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "email_sent" boolean NOT NULL DEFAULT false`);
        
        // Agregar unique al qr_code de subscriptions si no lo tiene
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "UQ_subscriptions_qr_code" UNIQUE ("qr_code")`).catch(() => {});

        // 2. Modificar Reservations: Agregar qr_code, guest_email y email_sent
        await queryRunner.query(`ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "qr_code" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "guest_email" character varying`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "email_sent" boolean NOT NULL DEFAULT false`);
        
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "UQ_reservations_qr_code" UNIQUE ("qr_code")`).catch(() => {});
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "UQ_reservations_qr_code"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "email_sent"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "guest_email"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN IF EXISTS "qr_code"`);

        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "UQ_subscriptions_qr_code"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "email_sent"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "qr_code"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "plate_numbers" SET NOT NULL`);
    }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add performance indexes for Vehicle and Driver entities
 * This migration should be run to optimize database queries
 */
export class AddVehicleAndDriverIndexes1702000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vehicle table indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vehicle_plate_number" ON "vehicles" ("plateNumber")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vehicle_is_active" ON "vehicles" ("isActive")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vehicle_created_at" ON "vehicles" ("createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vehicle_owner_name" ON "vehicles" ("ownerName")`
    );

    // Driver table indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_driver_id_number" ON "drivers" ("idNumber")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_driver_phone" ON "drivers" ("phone")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_driver_is_active" ON "drivers" ("isActive")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_driver_created_at" ON "drivers" ("createdAt")`
    );

    // Ticket table indexes (if not already present)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_code" ON "tickets" ("code")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_station_id" ON "tickets" ("stationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_vehicle_id" ON "tickets" ("vehicleId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_driver_id" ON "tickets" ("driverId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_created_at" ON "tickets" ("createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_status" ON "tickets" ("status")`
    );

    // Composite indexes for common queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vehicle_is_active_created_at" ON "vehicles" ("isActive", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_driver_is_active_created_at" ON "drivers" ("isActive", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_vehicle_id_created_at" ON "tickets" ("vehicleId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ticket_driver_id_created_at" ON "tickets" ("driverId", "createdAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_plate_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_owner_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_driver_id_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_driver_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_driver_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_driver_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_station_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_vehicle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_driver_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_is_active_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_driver_is_active_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_vehicle_id_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ticket_driver_id_created_at"`);
  }
}


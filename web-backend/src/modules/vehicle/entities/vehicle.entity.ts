import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
} from 'typeorm';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { Driver } from '../../driver/entities/driver.entity';

@Entity('vehicles')
@Index(['plateNumber'])
@Index(['isActive'])
@Index(['createdAt'])
export class Vehicle {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  plateNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vehicleType: string; // Loại xe: xe tải, xe ben, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerName: string; // Chủ sở hữu

  @Column({ type: 'varchar', length: 20, nullable: true })
  ownerPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxWeightLimit: number; // Giới hạn trọng lượng tối đa (kg)

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastCustomerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastProductName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastDriverName: string;

  @Column({ type: 'integer', default: 0 })
  totalWeighCount: number; // Tổng số lần cân

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalWeightProcessed: number; // Tổng trọng lượng đã cân

  @Column({ type: 'timestamp', nullable: true })
  lastWeighTime: Date; // Lần cân gần nhất

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.vehicle)
  tickets: Ticket[];

  @ManyToOne(() => Driver, (driver) => driver.vehicles, { nullable: true })
  defaultDriver: Driver;
}


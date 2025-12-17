import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity('drivers')
@Index(['idNumber'])
@Index(['phone'])
@Index(['isActive'])
@Index(['createdAt'])
export class Driver {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  idNumber: string; // CMND/CCCD

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  licenseNumber: string; // Số bằng lái

  @Column({ type: 'date', nullable: true })
  licenseExpireDate: Date; // Ngày hết hạn bằng lái

  @Column({ type: 'varchar', length: 100, nullable: true })
  licenseType: string; // Hạng bằng: A, B, C, D, E, etc.

  @Column({ type: 'integer', default: 0 })
  totalTrips: number; // Tổng số chuyến

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalWeightTransported: number; // Tổng trọng lượng vận chuyển

  @Column({ type: 'timestamp', nullable: true })
  lastTripTime: Date; // Chuyến gần nhất

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.defaultDriver)
  vehicles: Vehicle[];

  @OneToMany(() => Ticket, (ticket) => ticket.driver)
  tickets: Ticket[];
}



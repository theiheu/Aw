import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Station } from '../../station/entities/station.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { Product } from '../../product/entities/product.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { Driver } from '../../driver/entities/driver.entity';
import { User } from '../../auth/entities/user.entity';
import { WeighReading } from '../../weigh/entities/weigh-reading.entity';

export enum TicketStatus {
  CAN_VAO = 'CAN_VAO',
  DA_CAN_RA = 'DA_CAN_RA',
  HUY = 'HUY',
}

export enum TicketDirection {
  NHAP = 'NHAP',
  XUAT = 'XUAT',
}

@Entity('tickets')
@Index(['code'])
@Index(['stationId'])
@Index(['vehicleId'])
@Index(['driverId'])
@Index(['createdAt'])
@Index(['status'])
export class Ticket {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'int' })
  stationId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  plateNumber: string;

  @Column({ type: 'int', nullable: true })
  customerId: number;

  @Column({ type: 'int', nullable: true })
  productId: number;

  @Column({ type: 'int', nullable: true })
  vehicleId: number;

  @Column({ type: 'int', nullable: true })
  driverId: number;

  @Column({ type: 'int', nullable: true })
  weighInWeight: number; // kg

  @Column({ type: 'int', nullable: true })
  weighOutWeight: number; // kg

  @Column({ type: 'int', nullable: true })
  netWeight: number; // kg

  @Column({
    type: 'enum',
    enum: TicketDirection,
    default: TicketDirection.NHAP,
  })
  direction: TicketDirection;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.CAN_VAO,
  })
  status: TicketStatus;

  @Column({ type: 'int', nullable: true })
  createdBy: number;

  @Column({ type: 'int', nullable: true })
  confirmedBy: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Station, (station) => station.tickets)
  @JoinColumn({ name: 'stationId' })
  station: Station;

  @ManyToOne(() => Customer, (customer) => customer.tickets, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Product, (product) => product.tickets, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.tickets, { nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @ManyToOne(() => Driver, (driver) => driver.tickets, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'confirmedBy' })
  confirmer: User;

  @OneToMany(() => WeighReading, (reading) => reading.ticket)
  weighReadings: WeighReading[];
}


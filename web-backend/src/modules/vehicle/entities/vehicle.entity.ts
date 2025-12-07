import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  plateNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastCustomerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastProductName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastDriverName: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.vehicle)
  tickets: Ticket[];
}


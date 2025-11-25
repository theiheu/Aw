import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity('weigh_readings')
export class WeighReading {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int' })
  ticketId: number;

  @Column({ type: 'varchar', length: 50 })
  machineId: string;

  @Column({ type: 'int' })
  value: number; // kg

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  unit: string;

  @Column({ type: 'boolean', default: false })
  stable: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  raw: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.weighReadings)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;
}


import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Printer } from './printer.entity';

export enum PrintJobStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('print_jobs')
export class PrintJob {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int' })
  printerId: number;

  @Column({ type: 'int', nullable: true })
  ticketId: number;

  @Column({
    type: 'enum',
    enum: PrintJobStatus,
    default: PrintJobStatus.PENDING,
  })
  status: PrintJobStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 1 })
  copies: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Printer, (printer) => printer.printJobs)
  @JoinColumn({ name: 'printerId' })
  printer: Printer;
}


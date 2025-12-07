import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PrintJob } from './print-job.entity';

export enum PrinterType {
  A4_PDF = 'A4_PDF',
  ESC_POS = 'ESC_POS',
}

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: PrinterType,
    default: PrinterType.A4_PDF,
  })
  type: PrinterType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string;

  @Column({ type: 'int', nullable: true })
  port: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PrintJob, (job) => job.printer)
  printJobs: PrintJob[];
}


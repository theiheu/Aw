import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer, PrinterType } from './entities/printer.entity';
import { PrintJob, PrintJobStatus } from './entities/print-job.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Response } from 'express';

interface CreatePrintJobParams {
  machineId: string;
  copies: number;
  printerName?: string;
  idempotencyKey?: string;
  payload: Record<string, any>;
}

@Injectable()
export class PrintService implements OnModuleInit {
  private readonly baseTopic = process.env.MQTT_BASE_TOPIC || 'weigh';
  private readonly gotenbergUrl = process.env.GOTENBERG_URL || 'http://gotenberg:3000';
  private readonly publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost';

  // In-memory PDF cache (jobKey -> { buffer, expiresAt }) with TTL
  private pdfCache = new Map<string, { buf: Buffer; expiresAt: number }>();
  private readonly PDF_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  constructor(
    @InjectRepository(Printer)
    private printersRepository: Repository<Printer>,
    @InjectRepository(PrintJob)
    private printJobsRepository: Repository<PrintJob>,
    private mqttService: MqttService,
  ) {}

  onModuleInit() {
    // Subscribe to ACKs from all machines
    const topic = `${this.baseTopic}/+/print/acks`;
    this.mqttService.subscribe(topic, async (payload: any, topicStr: string) => {
      try {
        const jobId: string | undefined = payload?.id || payload?.jobId;
        const status: string | undefined = (payload?.status || '').toLowerCase();
        if (!jobId) return;

        const job = await this.printJobsRepository.findOne({ where: { idempotencyKey: jobId } });
        if (!job) return;

        if (status === 'printed' || status === 'success' || status === 'duplicate') {
          job.status = PrintJobStatus.COMPLETED;
          job.errorMessage = status === 'duplicate' ? 'duplicate' : null;
        } else if (status === 'error' || status === 'failed') {
          job.status = PrintJobStatus.FAILED;
          job.errorMessage = payload?.error || 'print error';
        }
        await this.printJobsRepository.save(job);
      } catch (e) {
        // swallow
      }
    });

    // Periodic cache cleanup
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.pdfCache.entries()) if (v.expiresAt <= now) this.pdfCache.delete(k);
    }, 10 * 60 * 1000);
  }

  async createPrinter(data: {
    name: string;
    type: PrinterType;
    ipAddress?: string;
    port?: number;
  }) {
    const printer = this.printersRepository.create(data);
    return this.printersRepository.save(printer);
  }

  async getPrinters() {
    return this.printersRepository.find({ where: { isActive: true } });
  }

  // New unified API for creating and dispatching a print job
  async createPrintJobAndDispatch(params: CreatePrintJobParams) {
    const { machineId, copies, printerName, idempotencyKey, payload } = params;
    const key = idempotencyKey || randomUUID();

    // Idempotency: if job exists, return it (do not re-publish)
    let job = await this.printJobsRepository.findOne({ where: { idempotencyKey: key } });
    if (job) {
      return this.serializeJob(job);
    }

    job = this.printJobsRepository.create({
      idempotencyKey: key,
      machineId,
      printerId: null,
      ticketId: payload?.ticketId ?? null,
      status: PrintJobStatus.PENDING,
      copies: copies || 1,
      payload,
    });
    await this.printJobsRepository.save(job);

    // Render PDF via Gotenberg and cache
    const pdfBuf = await this.renderPdf(payload);
    this.pdfCache.set(key, { buf: pdfBuf, expiresAt: Date.now() + this.PDF_TTL_MS });

    // Build absolute URL for agent to download
    const pdfUrl = `${this.publicBaseUrl.replace(/\/$/, '')}/api/print-jobs/${encodeURIComponent(key)}/pdf`;

    // Publish MQTT print job
    const topic = `${this.baseTopic}/${machineId}/print/jobs`;
    this.mqttService.publish(topic, {
      id: key,
      ticketId: payload?.ticketId,
      pdfUrl,
      copies: copies || 1,
      printer: printerName,
    });

    job.status = PrintJobStatus.SENT;
    await this.printJobsRepository.save(job);

    return this.serializeJob(job, pdfUrl);
  }

  async getPrintJobs(ticketId?: number) {
    const qb = this.printJobsRepository.createQueryBuilder('job');
    if (ticketId) qb.andWhere('job.ticketId = :ticketId', { ticketId });
    const rows = await qb.orderBy('job.createdAt', 'DESC').getMany();
    return rows.map((j) => this.serializeJob(j));
  }

  // Controller helper: stream cached or re-rendered PDF
  getPdfStreamByJobKey(jobKey: string) {
    const cached = this.pdfCache.get(jobKey);
    if (cached && cached.expiresAt > Date.now()) {
      return (res: Response) => res.end(cached.buf);
    }
    // Fallback: try to load job and re-render on demand
    return (res: Response) => {
      this.printJobsRepository.findOne({ where: { idempotencyKey: jobKey } })
        .then(async (job) => {
          if (!job || !job.payload) {
            res.status(404).end('Not found');
            return;
          }
          const buf = await this.renderPdf(job.payload);
          this.pdfCache.set(jobKey, { buf, expiresAt: Date.now() + this.PDF_TTL_MS });
          res.end(buf);
        })
        .catch(() => res.status(500).end('error'));
    };
  }

  async getJobStatus(jobKey: string) {
    const job = await this.printJobsRepository.findOne({ where: { idempotencyKey: jobKey } });
    if (!job) return { id: jobKey, status: 'NOT_FOUND' };
    return this.serializeJob(job);
  }

  private serializeJob(job: PrintJob, pdfUrl?: string) {
    return {
      id: job.idempotencyKey,
      dbId: job.id,
      machineId: job.machineId,
      ticketId: job.ticketId,
      status: job.status,
      errorMessage: job.errorMessage || null,
      copies: job.copies,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      pdfUrl,
    };
  }

  private async renderPdf(payload: Record<string, any>): Promise<Buffer> {
    const html = this.buildHtml(payload);

    const form = new FormData();
    form.append('files', Buffer.from(html, 'utf-8'), { filename: 'index.html', contentType: 'text/html' });

    const url = `${this.gotenbergUrl.replace(/\/$/, '')}/forms/chromium/convert/html`;
    const res = await fetch(url, { method: 'POST', body: form as any, headers: form.getHeaders() });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gotenberg failed: ${res.status} ${res.statusText} ${text}`);
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  private buildHtml(data: Record<string, any>): string {
    const now = new Date().toLocaleString('vi-VN');
    const title = 'PHIẾU CÂN';
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { text-align: center; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 6px; }
    .label { width: 35%; color: #444; }
    .value { width: 65%; font-weight: bold; }
    .footer { margin-top: 16px; text-align: right; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <tr><td class="label">Mã phiếu</td><td class="value">${this.safe(data.code)}</td></tr>
    <tr><td class="label">Biển số</td><td class="value">${this.safe(data.plateNumber)}</td></tr>
    <tr><td class="label">Hướng</td><td class="value">${this.safe(data.direction)}</td></tr>
    <tr><td class="label">Vào</td><td class="value">${this.safe(data.weighInWeight)} kg</td></tr>
    <tr><td class="label">Ra</td><td class="value">${this.safe(data.weighOutWeight)} kg</td></tr>
    <tr><td class="label">Khối lượng tịnh</td><td class="value">${this.safe(data.netWeight)} kg</td></tr>
  </table>
  <div class="footer">In lúc: ${now}</div>
</body>
</html>`;
  }

  private safe(v: any) {
    if (v === undefined || v === null) return '';
    return String(v).replace(/[<>]/g, '');
  }
}

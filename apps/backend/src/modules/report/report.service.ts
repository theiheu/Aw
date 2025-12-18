import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ticket, TicketStatus } from '../ticket/entities/ticket.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  async getDailyReport(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tickets = await this.ticketsRepository.find({
      where: {
        createdAt: Between(startOfDay, endOfDay),
        status: TicketStatus.DA_CAN_RA,
      },
      relations: ['customer', 'product'],
    });

    const totalNetWeight = tickets.reduce(
      (sum, ticket) => sum + (ticket.netWeight || 0),
      0,
    );

    const byCustomer = this.groupByCustomer(tickets);
    const byProduct = this.groupByProduct(tickets);

    return {
      date,
      totalTickets: tickets.length,
      totalNetWeight,
      byCustomer,
      byProduct,
      tickets,
    };
  }

  async getMonthlyReport(year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const tickets = await this.ticketsRepository.find({
      where: {
        createdAt: Between(startOfMonth, endOfMonth),
        status: TicketStatus.DA_CAN_RA,
      },
      relations: ['customer', 'product'],
    });

    const totalNetWeight = tickets.reduce(
      (sum, ticket) => sum + (ticket.netWeight || 0),
      0,
    );

    const byCustomer = this.groupByCustomer(tickets);
    const byProduct = this.groupByProduct(tickets);

    return {
      year,
      month,
      totalTickets: tickets.length,
      totalNetWeight,
      byCustomer,
      byProduct,
    };
  }

  async getCustomerReport(customerId: number, from: Date, to: Date) {
    const tickets = await this.ticketsRepository.find({
      where: {
        customerId,
        createdAt: Between(from, to),
        status: TicketStatus.DA_CAN_RA,
      },
      relations: ['product'],
    });

    const totalNetWeight = tickets.reduce(
      (sum, ticket) => sum + (ticket.netWeight || 0),
      0,
    );

    const byProduct = this.groupByProduct(tickets);

    return {
      customerId,
      from,
      to,
      totalTickets: tickets.length,
      totalNetWeight,
      byProduct,
      tickets,
    };
  }

  private groupByCustomer(tickets: Ticket[]) {
    const grouped: Record<string, any> = {};

    tickets.forEach((ticket) => {
      const customerName = ticket.customer?.name || 'Unknown';

      if (!grouped[customerName]) {
        grouped[customerName] = {
          name: customerName,
          count: 0,
          totalWeight: 0,
        };
      }

      grouped[customerName].count++;
      grouped[customerName].totalWeight += ticket.netWeight || 0;
    });

    return Object.values(grouped);
  }

  private groupByProduct(tickets: Ticket[]) {
    const grouped: Record<string, any> = {};

    tickets.forEach((ticket) => {
      const productName = ticket.product?.name || 'Unknown';

      if (!grouped[productName]) {
        grouped[productName] = {
          name: productName,
          count: 0,
          totalWeight: 0,
        };
      }

      grouped[productName].count++;
      grouped[productName].totalWeight += ticket.netWeight || 0;
    });

    return Object.values(grouped);
  }
}


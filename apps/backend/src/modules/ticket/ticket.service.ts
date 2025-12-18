import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ticket, TicketStatus, TicketDirection } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { StationService } from '../station/station.service';
import { WeighService } from '../weigh/weigh.service';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private stationService: StationService,
    private weighService: WeighService,
  ) {}

  async create(createTicketDto: CreateTicketDto) {
    const { stationId } = createTicketDto;

    // Verify station exists
    await this.stationService.findOne(stationId);

    // Generate ticket code
    const code = this.generateTicketCode();

    const ticket = this.ticketsRepository.create({
      ...createTicketDto,
      code,
      status: TicketStatus.CAN_VAO,
    });

    return this.ticketsRepository.save(ticket);
  }

  async findAll(filters?: {
    stationId?: number;
    status?: TicketStatus;
    from?: Date;
    to?: Date;
  }) {
    const query = this.ticketsRepository.createQueryBuilder('ticket');

    if (filters?.stationId) {
      query.andWhere('ticket.stationId = :stationId', {
        stationId: filters.stationId,
      });
    }

    if (filters?.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters?.from && filters?.to) {
      query.andWhere('ticket.createdAt BETWEEN :from AND :to', {
        from: filters.from,
        to: filters.to,
      });
    }

    return query.orderBy('ticket.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['station', 'customer', 'product', 'vehicle'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async weighIn(id: number, weighInWeight: number, userId: number) {
    const ticket = await this.findOne(id);

    if (ticket.weighInWeight) {
      throw new BadRequestException('Ticket already has weigh-in weight');
    }

    ticket.weighInWeight = weighInWeight;
    ticket.createdBy = userId;

    return this.ticketsRepository.save(ticket);
  }

  async weighOut(id: number, weighOutWeight: number, userId: number) {
    const ticket = await this.findOne(id);

    if (ticket.status !== TicketStatus.CAN_VAO) {
      throw new BadRequestException('Ticket is not in CAN_VAO status');
    }

    if (!ticket.weighInWeight) {
      throw new BadRequestException('Ticket does not have weigh-in weight');
    }

    ticket.weighOutWeight = weighOutWeight;
    ticket.netWeight = weighOutWeight - ticket.weighInWeight;
    ticket.status = TicketStatus.DA_CAN_RA;
    ticket.confirmedBy = userId;

    return this.ticketsRepository.save(ticket);
  }

  async cancel(id: number) {
    const ticket = await this.findOne(id);

    ticket.status = TicketStatus.HUY;

    return this.ticketsRepository.save(ticket);
  }

  async update(id: number, updateTicketDto: UpdateTicketDto) {
    const ticket = await this.findOne(id);

    Object.assign(ticket, updateTicketDto);

    return this.ticketsRepository.save(ticket);
  }

  private generateTicketCode(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    return `T${date}-${time}`;
  }
}


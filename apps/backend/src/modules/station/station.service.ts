import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Station } from './entities/station.entity';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';

@Injectable()
export class StationService {
  constructor(
    @InjectRepository(Station)
    private stationsRepository: Repository<Station>,
  ) {}

  async create(createStationDto: CreateStationDto) {
    const station = this.stationsRepository.create(createStationDto);
    return this.stationsRepository.save(station);
  }

  async findAll() {
    return this.stationsRepository.find({
      where: { isActive: true },
    });
  }

  async findOne(id: number) {
    const station = await this.stationsRepository.findOne({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    return station;
  }

  async findByMachineId(machineId: string) {
    return this.stationsRepository.findOne({
      where: { machineId },
    });
  }

  async update(id: number, updateStationDto: UpdateStationDto) {
    const station = await this.findOne(id);
    Object.assign(station, updateStationDto);
    return this.stationsRepository.save(station);
  }

  async remove(id: number) {
    const station = await this.findOne(id);
    station.isActive = false;
    return this.stationsRepository.save(station);
  }
}


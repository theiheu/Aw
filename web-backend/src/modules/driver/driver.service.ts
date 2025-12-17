import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>,
  ) {}

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    // Check if driver with same ID number already exists
    const existingDriver = await this.driversRepository.findOne({
      where: { idNumber: createDriverDto.idNumber },
    });

    if (existingDriver) {
      throw new ConflictException('Driver with this ID number already exists');
    }

    const driver = this.driversRepository.create(createDriverDto);
    return this.driversRepository.save(driver);
  }

  async findAll(
    skip: number = 0,
    take: number = 20,
    search?: string,
  ): Promise<{ data: Driver[]; total: number }> {
    const where: FindOptionsWhere<Driver> = { isActive: true };

    if (search) {
      return this.driversRepository.findAndCount({
        where: [
          { name: ILike(`%${search}%`), isActive: true },
          { idNumber: ILike(`%${search}%`), isActive: true },
          { phone: ILike(`%${search}%`), isActive: true },
        ],
        order: { createdAt: 'DESC' },
        skip,
        take,
      }).then(([data, total]) => ({ data, total }));
    }

    const [data, total] = await this.driversRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      where: { id },
      relations: ['vehicles', 'tickets'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async findByIdNumber(idNumber: string): Promise<Driver | null> {
    return this.driversRepository.findOne({
      where: { idNumber },
    });
  }

  async update(id: number, updateDriverDto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOne(id);

    // Check if trying to update ID number to one that already exists
    if (updateDriverDto.idNumber && updateDriverDto.idNumber !== driver.idNumber) {
      const existingDriver = await this.driversRepository.findOne({
        where: { idNumber: updateDriverDto.idNumber },
      });
      if (existingDriver) {
        throw new ConflictException('Driver with this ID number already exists');
      }
    }

    Object.assign(driver, updateDriverDto);
    return this.driversRepository.save(driver);
  }

  async remove(id: number): Promise<Driver> {
    const driver = await this.findOne(id);
    driver.isActive = false;
    return this.driversRepository.save(driver);
  }

  async getDriverStats(id: number) {
    const driver = await this.findOne(id);
    const ticketCount = await this.driversRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.tickets', 'tickets')
      .where('driver.id = :id', { id })
      .getCount();

    return {
      id: driver.id,
      name: driver.name,
      totalTrips: driver.totalTrips,
      totalWeightTransported: driver.totalWeightTransported,
      lastTripTime: driver.lastTripTime,
      ticketCount,
    };
  }

  async updateDriverStats(driverId: number, weight: number): Promise<void> {
    await this.driversRepository.update(
      { id: driverId },
      {
        totalTrips: () => 'totalTrips + 1',
        totalWeightTransported: () => `totalWeightTransported + ${weight}`,
        lastTripTime: new Date(),
      },
    );
  }
}



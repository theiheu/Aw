import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehicleService {
  private readonly cacheMap = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
  ) {}

  private getCacheKey(key: string): string {
    return `vehicle:${key}`;
  }

  private getFromCache(key: string): any | null {
    const cacheKey = this.getCacheKey(key);
    const cached = this.cacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cacheMap.delete(cacheKey);
    return null;
  }

  private setCache(key: string, data: any): void {
    const cacheKey = this.getCacheKey(key);
    this.cacheMap.set(cacheKey, { data, timestamp: Date.now() });
  }

  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cacheMap.keys()) {
        if (key.includes(pattern)) {
          this.cacheMap.delete(key);
        }
      }
    } else {
      this.cacheMap.clear();
    }
  }

  async create(createVehicleDto: CreateVehicleDto) {
    const vehicle = this.vehiclesRepository.create(createVehicleDto);
    const saved = await this.vehiclesRepository.save(vehicle);
    this.invalidateCache('list');
    return saved;
  }

  async findAll(
    skip: number = 0,
    take: number = 20,
    search?: string,
  ): Promise<{ data: Vehicle[]; total: number }> {
    const cacheKey = `list:${skip}:${take}:${search || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const where: FindOptionsWhere<Vehicle> = { isActive: true };

    let query = this.vehiclesRepository.createQueryBuilder('vehicle');

    if (search) {
      query = query.where(
        '(vehicle.plateNumber ILIKE :search OR vehicle.ownerName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    query = query
      .andWhere('vehicle.isActive = :isActive', { isActive: true })
      .orderBy('vehicle.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    const [data, total] = await query.getManyAndCount();
    const result = { data, total };

    this.setCache(cacheKey, result);
    return result;
  }

  async findOne(id: number) {
    const cacheKey = `id:${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: ['defaultDriver', 'tickets'],
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    this.setCache(cacheKey, vehicle);
    return vehicle;
  }

  async findByPlateNumber(plateNumber: string) {
    const cacheKey = `plate:${plateNumber}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const vehicle = await this.vehiclesRepository.findOne({
      where: { plateNumber },
    });

    if (vehicle) {
      this.setCache(cacheKey, vehicle);
    }

    return vehicle;
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);
    Object.assign(vehicle, updateVehicleDto);
    const updated = await this.vehiclesRepository.save(vehicle);
    this.invalidateCache();
    return updated;
  }

  async remove(id: number) {
    const vehicle = await this.findOne(id);
    vehicle.isActive = false;
    const removed = await this.vehiclesRepository.save(vehicle);
    this.invalidateCache();
    return removed;
  }

  async updateVehicleStats(vehicleId: number, weight: number): Promise<void> {
    await this.vehiclesRepository.update(
      { id: vehicleId },
      {
        totalWeighCount: () => 'totalWeighCount + 1',
        totalWeightProcessed: () => `totalWeightProcessed + ${weight}`,
        lastWeighTime: new Date(),
      },
    );
    this.invalidateCache(`id:${vehicleId}`);
  }

  async getVehicleStats(id: number) {
    const vehicle = await this.findOne(id);
    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      totalWeighCount: vehicle.totalWeighCount,
      totalWeightProcessed: vehicle.totalWeightProcessed,
      lastWeighTime: vehicle.lastWeighTime,
      maxWeightLimit: vehicle.maxWeightLimit,
    };
  }
}


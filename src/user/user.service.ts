import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { User } from './entities/user.entity';
import { FindUsersDto } from './dto/find-users.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  create(createUserDto: Partial<User>): Promise<User> {
    return this.userRepository.save(createUserDto);
  }

  async findAll(
    findUsersDto?: FindUsersDto,
  ): Promise<{ users: User[]; total: number }> {
    if (!findUsersDto) {
      const users = await this.userRepository.find();
      return { users, total: users.length };
    }

    const {
      limit = 10,
      offset = 0,
      search,
      minPoints,
      maxPoints,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = findUsersDto;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    if (minPoints !== undefined) {
      queryBuilder.andWhere('user.penaltyPoints >= :minPoints', { minPoints });
    }

    if (maxPoints !== undefined) {
      queryBuilder.andWhere('user.penaltyPoints <= :maxPoints', { maxPoints });
    }

    // Corregimos el orderBy para usar correctamente el alias de la tabla
    const [users, total] = await queryBuilder
      .orderBy(`user.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  updateRole(id: string, role: User['role']): Promise<UpdateResult> {
    return this.userRepository.update(id, { role });
  }
}

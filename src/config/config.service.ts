import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './entities/config.entity';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import {
  getFirebaseConfig,
  updateFirebaseConfig,
} from '../utils/firebase-admin.config';
import { BotConfig } from 'src/utils/types';
import { XpRoleDto } from './dto/xp-role.dto';
import { UpdateNormativeDto } from './dto/update-normative.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Config)
    private configRepository: Repository<Config>,
  ) {}

  async create(createConfigDto: CreateConfigDto): Promise<Config> {
    const newConfig = new Config();
    Object.assign(newConfig, createConfigDto);
    return this.configRepository.save(newConfig);
  }

  async getConfig(): Promise<Config> {
    const config = await this.configRepository
      .createQueryBuilder('config')
      .orderBy('config.createdAt', 'DESC')
      .getOne();

    if (!config) {
      return this.createDefaultConfig();
    }

    return config;
  }

  async createDefaultConfig(): Promise<Config> {
    const defaultConfig = new Config();
    defaultConfig.generalNormative = '<p>Normativa general predeterminada.</p>';
    defaultConfig.staffNormative = '<p>Normativa del staff predeterminada.</p>';
    defaultConfig.projectInfo =
      '<p>Información del proyecto predeterminada.</p>';
    defaultConfig.privacyPolicies =
      '<p>Políticas de privacidad predeterminadas.</p>';
    defaultConfig.privacyNotice = '<p>Aviso de privacidad predeterminado.</p>';
    defaultConfig.watchedChannels = [];
    defaultConfig.watchedForums = [];
    defaultConfig.infractions = [
      {
        name: 'Negro - Infracción muy grave',
        value: 'BLACK',
        points: 10,
        emoji: '◼️',
        description: 'Infracciones muy graves',
      },
      {
        name: 'Rojo - Infracción grave',
        value: 'RED',
        points: 5,
        emoji: '♦️',
        description: 'Infracciones graves',
      },
      {
        name: 'Naranja - Infracción moderada',
        value: 'ORANGE',
        points: 3,
        emoji: '🔶',
        description: 'Infracciones moderadas',
      },
      {
        name: 'Amarillo - Infracción leve',
        value: 'YELLOW',
        points: 2,
        emoji: '☢️',
        description: 'Infracciones leves',
      },
    ];
    defaultConfig.xpRoles = [
      {
        roleId: '',
        name: 'Nivel 1',
        requiredXp: 100,
      },
      {
        roleId: '',
        name: 'Nivel 2',
        requiredXp: 500,
      },
    ];
    return this.configRepository.save(defaultConfig);
  }

  async update(updateConfigDto: UpdateConfigDto): Promise<Config> {
    const config = await this.getConfig();
    Object.assign(config, updateConfigDto);
    return this.configRepository.save(config);
  }

  async getGeneralNormative(): Promise<string> {
    const config = await this.getConfig();
    return config.generalNormative;
  }

  async getStaffNormative(): Promise<string> {
    const config = await this.getConfig();
    return config.staffNormative;
  }

  async getProjectInfo(): Promise<string> {
    const config = await this.getConfig();
    return config.projectInfo;
  }

  async getPrivacyPolicies(): Promise<string> {
    const config = await this.getConfig();
    return config.privacyPolicies;
  }

  async getPrivacyNotice(): Promise<string> {
    const config = await this.getConfig();
    return config.privacyNotice;
  }

  async isWatchedChannel(channelId: string): Promise<boolean> {
    const config = await this.getConfig();
    return (
      config.watchedChannels.includes(channelId) ||
      config.watchedForums.includes(channelId)
    );
  }

  async getWatchedChannels(): Promise<string[]> {
    const config = await this.getConfig();
    return config.watchedChannels;
  }

  async getWatchedForums(): Promise<string[]> {
    const config = await this.getConfig();
    return config.watchedForums;
  }

  async getInfractions(): Promise<any[]> {
    const config = await this.getConfig();
    return config.infractions;
  }

  async getFirebaseConfig(): Promise<BotConfig> {
    return await getFirebaseConfig();
  }

  async updateFirebaseConfigObject(updates: BotConfig): Promise<void> {
    await updateFirebaseConfig(updates);
  }

  async getXpRoles(): Promise<XpRoleDto[]> {
    const config = await this.getConfig();
    return config.xpRoles;
  }

  async updateXpRoles(xpRoles: XpRoleDto[]): Promise<Config> {
    const config = await this.getConfig();
    config.xpRoles = xpRoles;
    return this.configRepository.save(config);
  }

  async updateNormative(
    updateNormativeDto: UpdateNormativeDto,
  ): Promise<Config> {
    const config = await this.getConfig();

    if (updateNormativeDto.generalNormative !== undefined) {
      config.generalNormative = updateNormativeDto.generalNormative;
    }

    if (updateNormativeDto.staffNormative !== undefined) {
      config.staffNormative = updateNormativeDto.staffNormative;
    }

    return this.configRepository.save(config);
  }
}

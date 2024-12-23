import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Config } from './entities/config.entity';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('general-normative')
  @ApiOperation({ summary: 'Obtener las normativas generales' })
  @ApiOkResponse({
    description: 'Normativas generales devueltas correctamente',
    type: String,
  })
  async getGeneralNormative(): Promise<string> {
    return this.configService.getGeneralNormative();
  }

  @Get('staff-normative')
  @ApiOperation({ summary: 'Obtener las normativas del staff' })
  @ApiOkResponse({
    description: 'Normativas del staff devueltas correctamente',
    type: String,
  })
  async getStaffNormative(): Promise<string> {
    return this.configService.getStaffNormative();
  }

  @Get('project-info')
  @ApiOperation({ summary: 'Obtener la información del proyecto' })
  @ApiOkResponse({
    description: 'Información del proyecto devuelta correctamente',
    type: String,
  })
  async getProjectInfo(): Promise<string> {
    return this.configService.getProjectInfo();
  }

  @Get('privacy-policies')
  @ApiOperation({ summary: 'Obtener las políticas de privacidad' })
  @ApiOkResponse({
    description: 'Políticas de privacidad devueltas correctamente',
    type: String,
  })
  async getPrivacyPolicies(): Promise<string> {
    return this.configService.getPrivacyPolicies();
  }

  @Get('privacy-notice')
  @ApiOperation({ summary: 'Obtener el aviso de privacidad' })
  @ApiOkResponse({
    description: 'Aviso de privacidad devuelto correctamente',
    type: String,
  })
  async getPrivacyNotice(): Promise<string> {
    return this.configService.getPrivacyNotice();
  }

  @Get('watched-channels')
  @ApiOperation({ summary: 'Obtener los canales observados' })
  @ApiOkResponse({
    description: 'Lista de IDs de canales observados',
    type: [String],
  })
  async getWatchedChannels(): Promise<string[]> {
    return this.configService.getWatchedChannels();
  }

  @Get('watched-forums')
  @ApiOperation({ summary: 'Obtener los foros observados' })
  @ApiOkResponse({
    description: 'Lista de IDs de foros observados',
    type: [String],
  })
  async getWatchedForums(): Promise<string[]> {
    return this.configService.getWatchedForums();
  }

  @Patch()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar la configuración' })
  @ApiOkResponse({
    description: 'Configuración actualizada correctamente',
    type: Config,
  })
  async updateConfig(
    @Body() updateConfigDto: UpdateConfigDto,
  ): Promise<Config> {
    return this.configService.update(updateConfigDto);
  }
}

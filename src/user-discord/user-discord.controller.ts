import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Post,
} from '@nestjs/common';
import { UserDiscordService } from './user-discord.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  UserRole,
  UserDiscord,
  DiscordRole,
} from './entities/user-discord.entity'; // Añadida importación de DiscordRole
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UpdateResult } from 'typeorm';
import { FindUsersDto } from './dto/find-users.dto';
import { CreateUserDiscordDto } from './dto/create-user-discord.dto';

@ApiTags('discord-users')
@ApiBearerAuth()
@Controller('discord-users')
export class UserDiscordController {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener usuarios de Discord con filtros opcionales y paginación',
  })
  @ApiOkResponse({
    description: 'Lista de usuarios de Discord',
    schema: {
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserDiscord' },
        },
        total: {
          type: 'number',
          description: 'Total de usuarios que coinciden con los filtros',
        },
      },
    },
  })
  @Get()
  @ApiOperation({ summary: 'Obtener usuarios con filtros avanzados' })
  @ApiOkResponse({
    description: 'Lista paginada de usuarios con total',
    type: UserDiscord,
    isArray: true,
  })
  findAll(@Query() findUsersDto: FindUsersDto) {
    return this.userDiscordService.findAll(findUsersDto);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario de Discord' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  create(@Body() createUserDiscordDto: CreateUserDiscordDto) {
    return this.userDiscordService.create(createUserDiscordDto);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener un usuario de Discord por ID' })
  @ApiOkResponse({ description: 'Usuario encontrado', type: UserDiscord })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserDiscord> {
    return this.userDiscordService.findOne(id);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar roles de un usuario de Discord',
  })
  @ApiOkResponse({
    description: 'Roles actualizados correctamente',
  })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @Patch(':id/roles')
  updateRoles(
    @Param('id') id: string,
    @Body() updateRolesDto: { roles: DiscordRole[] },
  ): Promise<UpdateResult> {
    return this.userDiscordService.updateRoles(id, updateRolesDto.roles);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar puntos de penalización de un usuario de Discord',
  })
  @ApiOkResponse({
    description: 'Puntos actualizados correctamente',
  })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @Patch(':id/points')
  updatePoints(
    @Param('id') id: string,
    @Body() updatePointsDto: { points: number },
  ): Promise<UpdateResult> {
    return this.userDiscordService.updatePoints(id, updatePointsDto.points);
  }
}

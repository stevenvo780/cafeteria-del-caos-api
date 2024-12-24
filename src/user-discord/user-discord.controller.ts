import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserDiscordService } from './user-discord.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, UserDiscord } from './entities/user-discord.entity';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { FindUsersDto } from './dto/find-users.dto';
import { CreateUserDiscordDto } from './dto/create-user-discord.dto';
import { UpdateUserDiscordDto } from './dto/update-user-discord.dto';

@ApiTags('discord-users')
@ApiBearerAuth()
@Controller('discord-users')
export class UserDiscordController {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario de Discord' })
  @ApiResponse({ status: 201, type: UserDiscord })
  create(@Body() createUserDiscordDto: CreateUserDiscordDto) {
    return this.userDiscordService.create(createUserDiscordDto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener usuarios con filtros' })
  @ApiOkResponse({
    description: 'Lista paginada de usuarios',
    type: UserDiscord,
    isArray: true,
  })
  findAll(@Query() findUsersDto: FindUsersDto) {
    return this.userDiscordService.findAll(findUsersDto);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiOkResponse({ type: UserDiscord })
  findOne(@Param('id') id: string) {
    return this.userDiscordService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiOkResponse({ type: UserDiscord })
  update(
    @Param('id') id: string,
    @Body() updateUserDiscordDto: UpdateUserDiscordDto,
  ) {
    console.log(updateUserDiscordDto);
    return this.userDiscordService.update(id, updateUserDiscordDto);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiOkResponse({ description: 'Usuario eliminado' })
  remove(@Param('id') id: string) {
    return this.userDiscordService.remove(id);
  }
}

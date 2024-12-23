import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { RequestWithUser } from '../auth/types';
import { UpdateResult } from 'typeorm';
import { FindUsersDto } from './dto/find-users.dto';
import { UpdatePointsDto } from './dto/update-points.dto';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener usuarios con filtros opcionales y paginación',
  })
  @ApiOkResponse({
    description: 'Lista de usuarios',
    schema: {
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/User' },
        },
        total: {
          type: 'number',
          description: 'Total de usuarios que coinciden con los filtros',
        },
      },
    },
  })
  @Get()
  findAll(@Query() findUsersDto: FindUsersDto) {
    return this.userService.findAll(findUsersDto);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener un usuario por ID (Solo Super Admin)' })
  @ApiOkResponse({ description: 'Usuario encontrado', type: User })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  @ApiOkResponse({
    description: 'Usuario autenticado devuelto correctamente.',
    type: User,
  })
  @Get('me/data')
  getMe(@Request() req: RequestWithUser): User {
    return req.user;
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Actualizar el rol de un usuario por ID (Solo Super Admin)',
  })
  @ApiOkResponse({
    description: 'El rol del usuario ha sido actualizado correctamente.',
  })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Patch(':id')
  updateRole(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<Pick<User, 'role'>>,
  ): Promise<UpdateResult> {
    return this.userService.updateRole(id, updateUserDto.role);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar puntos de penalización de un usuario',
  })
  @ApiOkResponse({
    description: 'Puntos actualizados correctamente',
  })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @Patch(':id/points')
  updatePoints(
    @Param('id') id: string,
    @Body() updatePointsDto: UpdatePointsDto,
  ): Promise<UpdateResult> {
    return this.userService.updatePoints(id, updatePointsDto.points);
  }
}

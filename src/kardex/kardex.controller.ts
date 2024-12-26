import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { KardexService } from './kardex.service';
import { CreateKardexDto } from './dto/create-kardex.dto';
import { UpdateKardexDto } from './dto/update-kardex.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user-discord/entities/user-discord.entity';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('kardex')
@ApiBearerAuth()
@Controller('kardex')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new Kardex entry' })
  create(@Body() dto: CreateKardexDto) {
    return this.kardexService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Find all Kardex entries' })
  findAll() {
    return this.kardexService.findAll();
  }

  @Get('balance/:userDiscordId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get last balance for a user' })
  getBalance(@Param('userDiscordId') userDiscordId: string) {
    return this.kardexService.getUserLastBalance(userDiscordId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Find one Kardex entry by ID' })
  findOne(@Param('id') id: string) {
    return this.kardexService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing Kardex entry' })
  update(@Param('id') id: string, @Body() dto: UpdateKardexDto) {
    return this.kardexService.update(+id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a Kardex entry' })
  remove(@Param('id') id: string) {
    return this.kardexService.remove(+id);
  }

  @Post('cash-in/:userDiscordId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add coins to reach desired balance' })
  async cashIn(
    @Param('userDiscordId') userDiscordId: string,
    @Body() body: { targetBalance: number; reference?: string },
  ) {
    return this.kardexService.adjustBalanceToTarget(
      userDiscordId,
      body.targetBalance,
      body.reference || 'Admin cash-in',
    );
  }

  @Post('cash-out/:userDiscordId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove coins to reach desired balance' })
  async cashOut(
    @Param('userDiscordId') userDiscordId: string,
    @Body() body: { targetBalance: number; reference?: string },
  ) {
    return this.kardexService.adjustBalanceToTarget(
      userDiscordId,
      body.targetBalance,
      body.reference || 'Admin cash-out',
    );
  }
}

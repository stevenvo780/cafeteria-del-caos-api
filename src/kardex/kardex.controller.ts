import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { KardexService } from './kardex.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user-discord/entities/user-discord.entity';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilterKardexDto } from './dto/filter-kardex.dto';

@ApiTags('kardex')
@ApiBearerAuth()
@Controller('kardex')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Find all Kardex entries' })
  @Get()
  findAll() {
    return this.kardexService.findAll();
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get last balance for a user' })
  @Get('balance/:userDiscordId')
  getBalance(@Param('userDiscordId') userDiscordId: string) {
    return this.kardexService.getUserLastBalance(userDiscordId);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Find one Kardex entry by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kardexService.findOne(id);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add coins to reach desired balance' })
  @Post('cash-in/:userDiscordId')
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

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove coins to reach desired balance' })
  @Post('cash-out/:userDiscordId')
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

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Search Kardex entries with filters and pagination',
  })
  @Get('search/page')
  async search(@Query() filters: FilterKardexDto) {
    return this.kardexService.findWithFilters(filters);
  }
}

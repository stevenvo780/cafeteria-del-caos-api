import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { LibraryReferenceDto } from './dto/library-reference.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from '../auth/optional-firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { RequestWithUser } from '../auth/types';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Library, LibraryVisibility } from './entities/library.entity';
import { DeleteResult } from 'typeorm';
import { CreateWithFolderDto } from './dto/create-with-folder.dto';

@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @ApiOperation({ summary: 'Get all library references with pagination' })
  @ApiOkResponse({
    description: 'Paginated list of library references',
    type: [Library],
  })
  @Get()
  @UseGuards(OptionalFirebaseAuthGuard)
  findAll(
    @Request() req: RequestWithUser,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<{ data: Library[]; total: number; currentPage: number }> {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    return this.libraryService.findAll(req.user, pageNumber, limitNumber);
  }

  @ApiOperation({ summary: 'Get a library reference by ID' })
  @ApiOkResponse({ description: 'Library reference found', type: Library })
  @Get(':id')
  @UseGuards(OptionalFirebaseAuthGuard)
  findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Library> {
    return this.libraryService.findOne(+id, req.user);
  }

  @ApiOperation({ summary: 'Create a new library reference' })
  @ApiCreatedResponse({
    description: 'The reference has been successfully created.',
    type: Library,
  })
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  create(
    @Request() req: RequestWithUser,
    @Body() createLibraryDto: CreateLibraryDto,
  ): Promise<Library> {
    return this.libraryService.create(createLibraryDto, req.user);
  }

  @Post('with-folder')
  @ApiOperation({
    summary:
      "Create a new note inside a folder (creates folder if it doesn't exist)",
  })
  @ApiCreatedResponse({
    description: 'The note has been successfully created inside the folder.',
    type: Library,
  })
  async createWithFolder(
    @Request() req: RequestWithUser,
    @Body() createWithFolderDto: CreateWithFolderDto,
    @Headers('x-bot-api-key') botKey: string,
  ): Promise<Library> {
    if (botKey !== process.env.BOT_SYNC_KEY) {
      throw new UnauthorizedException('Llave inválida');
    }
    const folder = await this.libraryService.findOrCreateByTitle(
      createWithFolderDto.folderTitle,
      createWithFolderDto.visibility || LibraryVisibility.USERS,
      null,
    );

    const createLibraryDto = {
      title: createWithFolderDto.title,
      description: createWithFolderDto.description,
      parentNoteId: folder.id,
      visibility: createWithFolderDto.visibility,
      imageUrl: createWithFolderDto.imageUrl,
      referenceDate: new Date(),
    };

    return this.libraryService.create(createLibraryDto, req.user);
  }

  @ApiOperation({ summary: 'Update a library reference by ID' })
  @ApiOkResponse({ description: 'Library reference updated', type: Library })
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateLibraryDto: UpdateLibraryDto,
  ): Promise<Library> {
    return this.libraryService.update(+id, updateLibraryDto, req.user);
  }

  @ApiOperation({ summary: 'Delete a library reference by ID' })
  @ApiOkResponse({
    description: 'Library reference deleted',
    type: DeleteResult,
  })
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  remove(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<DeleteResult> {
    return this.libraryService.remove(+id, req.user);
  }

  @ApiOperation({ summary: 'Get latest library references' })
  @ApiOkResponse({
    description: 'List of latest library references',
    type: [Library],
  })
  @Get('home/latest')
  @UseGuards(OptionalFirebaseAuthGuard)
  findLatest(
    @Query('limit') limit: string,
    @Request() req: RequestWithUser,
  ): Promise<Library[]> {
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    return this.libraryService.findLatest(parsedLimit, req.user);
  }

  @ApiOperation({
    summary: 'Search library references by title and/or description',
  })
  @ApiOkResponse({ description: 'Search results', type: [Library] })
  @Get('view/search')
  @UseGuards(OptionalFirebaseAuthGuard)
  search(
    @Request() req: RequestWithUser,
    @Query('query') query?: string,
  ): Promise<Library[]> {
    return this.libraryService.search(query, req.user);
  }

  @ApiOperation({ summary: 'Get all library references' })
  @Get('view/references')
  @UseGuards(OptionalFirebaseAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EDITOR)
  async getAllReferences(): Promise<LibraryReferenceDto[]> {
    return this.libraryService.getAllReferences();
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { Library, LibraryVisibility } from './entities/library.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { LibraryReferenceDto } from './dto/library-reference.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
  ) {}

  async create(
    createLibraryDto: CreateLibraryDto,
    user: User | null,
  ): Promise<Library> {
    const newLibraryItem = this.libraryRepository.create({
      ...createLibraryDto,
      author: user,
      visibility: createLibraryDto.visibility || LibraryVisibility.USERS,
    });

    if (createLibraryDto.parentNoteId) {
      const parentNote = await this.libraryRepository.findOne({
        where: { id: createLibraryDto.parentNoteId },
      });
      if (parentNote) {
        newLibraryItem.parent = parentNote;
      }
    }

    return this.libraryRepository.save(newLibraryItem);
  }

  async findAll(
    user?: User,
    page = 1,
    limit = 10,
  ): Promise<{ data: Library[]; total: number; currentPage: number }> {
    let query = this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.children', 'children')
      .where('library.parent IS NULL');

    if (user) {
      if (user.role === UserRole.USER || user.role === UserRole.EDITOR) {
        query = query.andWhere('library.visibility IN (:...visibilities)', {
          visibilities: [LibraryVisibility.GENERAL, LibraryVisibility.USERS],
        });
      } else if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN
      ) {
        query = query.andWhere('library.visibility IN (:...visibilities)', {
          visibilities: [
            LibraryVisibility.GENERAL,
            LibraryVisibility.USERS,
            LibraryVisibility.ADMIN,
          ],
        });
      }
    } else {
      query = query.andWhere('library.visibility = :visibility', {
        visibility: LibraryVisibility.GENERAL,
      });
    }

    const [data, total] = await query
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return { data, total, currentPage: page };
  }

  async findOne(id: number, user?: User): Promise<Library> {
    const library = await this.libraryRepository.findOne({
      where: { id },
      relations: ['children', 'author'],
    });
    if (!library) throw new Error('Nota no encontrada');

    if (
      (library.visibility === LibraryVisibility.ADMIN &&
        (!user ||
          (user.role !== UserRole.ADMIN &&
            user.role !== UserRole.SUPER_ADMIN))) ||
      (library.visibility === LibraryVisibility.USERS &&
        (!user || user.role === UserRole.USER))
    ) {
      throw new ForbiddenException('No tienes acceso a esta nota');
    }

    return library;
  }

  async findLatest(limit: number, user?: User): Promise<Library[]> {
    let query = this.libraryRepository
      .createQueryBuilder('library')
      .orderBy('library.createdAt', 'DESC')
      .take(limit);

    if (user) {
      if (user.role === UserRole.USER || user.role === UserRole.EDITOR) {
        query = query.andWhere('library.visibility IN (:...visibilities)', {
          visibilities: [LibraryVisibility.GENERAL, LibraryVisibility.USERS],
        });
      } else if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN
      ) {
        query = query.andWhere('library.visibility IN (:...visibilities)', {
          visibilities: [
            LibraryVisibility.GENERAL,
            LibraryVisibility.USERS,
            LibraryVisibility.ADMIN,
          ],
        });
      }
    } else {
      query = query.andWhere('library.visibility = :visibility', {
        visibility: LibraryVisibility.GENERAL,
      });
    }

    return query.getMany();
  }

  async update(
    id: number,
    updateLibraryDto: UpdateLibraryDto,
    user: User,
  ): Promise<Library> {
    const libraryItem = await this.findOne(id, user);
    if (!libraryItem) throw new Error('Nota no encontrada');

    if (user.role === UserRole.EDITOR && libraryItem.author.id !== user.id) {
      throw new ForbiddenException(
        'No puedes editar una nota que no hayas creado',
      );
    }

    if (updateLibraryDto.parentNoteId !== undefined) {
      if (updateLibraryDto.parentNoteId === null) {
        libraryItem.parent = null;
      } else {
        const newParent = await this.libraryRepository.findOne({
          where: { id: updateLibraryDto.parentNoteId },
        });
        if (!newParent) {
          throw new Error('Nota padre no encontrada');
        }
        if (await this.wouldCreateCycle(id, updateLibraryDto.parentNoteId)) {
          throw new ForbiddenException(
            'No se puede crear un ciclo en la jerarquía de notas',
          );
        }
        libraryItem.parent = newParent;
      }
    }

    if (updateLibraryDto.title !== undefined)
      libraryItem.title = updateLibraryDto.title;
    if (updateLibraryDto.description !== undefined)
      libraryItem.description = updateLibraryDto.description;
    if (updateLibraryDto.visibility !== undefined)
      libraryItem.visibility = updateLibraryDto.visibility;
    if (updateLibraryDto.referenceDate !== undefined)
      libraryItem.referenceDate = updateLibraryDto.referenceDate;

    return await this.libraryRepository.save(libraryItem);
  }

  private async wouldCreateCycle(
    libraryId: number,
    newParentId: number,
  ): Promise<boolean> {
    let currentId = newParentId;
    while (currentId) {
      if (currentId === libraryId) return true;
      const parent = await this.libraryRepository.findOne({
        where: { id: currentId },
        relations: ['parent'],
      });
      if (!parent || !parent.parent) break;
      currentId = parent.parent.id;
    }
    return false;
  }

  async remove(id: number, user: User): Promise<DeleteResult> {
    const libraryItem = await this.findOne(id, user);

    if (!libraryItem) throw new Error('Nota no encontrada');

    if (user.role === UserRole.EDITOR && libraryItem.author.id !== user.id) {
      throw new ForbiddenException(
        'No puedes eliminar una nota que no hayas creado',
      );
    }

    return this.libraryRepository.delete(id);
  }

  async search(query: string, user?: User): Promise<Library[]> {
    let searchQuery = this.libraryRepository.createQueryBuilder('library');

    if (user) {
      if (user.role === UserRole.USER || user.role === UserRole.EDITOR) {
        searchQuery = searchQuery.andWhere(
          'library.visibility IN (:...visibilities)',
          {
            visibilities: [LibraryVisibility.GENERAL, LibraryVisibility.USERS],
          },
        );
      } else if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.SUPER_ADMIN
      ) {
        searchQuery = searchQuery.andWhere(
          'library.visibility IN (:...visibilities)',
          {
            visibilities: [
              LibraryVisibility.GENERAL,
              LibraryVisibility.USERS,
              LibraryVisibility.ADMIN,
            ],
          },
        );
      }
    } else {
      searchQuery = searchQuery.andWhere('library.visibility = :visibility', {
        visibility: LibraryVisibility.GENERAL,
      });
    }

    searchQuery
      .andWhere('library.title LIKE :query', { query: `%${query}%` })
      .orWhere('library.description LIKE :query', { query: `%${query}%` });

    return searchQuery.getMany();
  }

  async findOrCreateByTitle(
    title: string,
    visibility: LibraryVisibility = LibraryVisibility.USERS,
  ): Promise<Library> {
    const existingNote = await this.libraryRepository.findOne({
      where: { title },
    });

    if (existingNote) {
      return existingNote;
    }

    const newNote = this.libraryRepository.create({
      title,
      description: `Carpeta automática para: ${title}`,
      referenceDate: new Date(),
      visibility,
    });

    return this.libraryRepository.save(newNote);
  }

  async getAllReferences(): Promise<LibraryReferenceDto[]> {
    const references = await this.libraryRepository
      .createQueryBuilder('library')
      .select(['library.id', 'library.title'])
      .getMany();
    return references.map((ref) => ({
      id: ref.id,
      title: ref.title,
    }));
  }
}

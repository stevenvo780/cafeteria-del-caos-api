// dto/update-kardex.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateKardexDto } from './create-kardex.dto';

export class UpdateKardexDto extends PartialType(CreateKardexDto) {}

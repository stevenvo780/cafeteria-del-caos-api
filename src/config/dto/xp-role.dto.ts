import { ApiProperty } from '@nestjs/swagger';

export class XpRoleDto {
  @ApiProperty({
    description: 'ID del rol de Discord',
    example: '123456789',
  })
  roleId: string;

  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Nivel 1',
  })
  name: string;

  @ApiProperty({
    description: 'Cantidad de XP necesaria para obtener el rol',
    example: 100,
  })
  requiredXp: number;
}

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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
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
import { Product } from './entities/product.entity';
import { DeleteResult } from 'typeorm';
import { exec } from 'child_process';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Obtener todos los productos' })
  @ApiOkResponse({
    description: 'Lista de todos los productos',
    type: [Product],
  })
  @Get()
  async findAll(
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ): Promise<{ products: Product[]; total: number }> {
    return this.productService.findAll(Number(limit), Number(offset));
  }

  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiOkResponse({ description: 'Producto encontrado', type: Product })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productService.findOne(+id);
  }

  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiCreatedResponse({
    description: 'El producto ha sido creado correctamente.',
    type: Product,
  })
  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async create(
    @Request() req: RequestWithUser,
    @Body() createProductDto: CreateProductDto,
  ): Promise<Product> {
    const product = await this.productService.create(
      createProductDto,
      req.user,
    );
    try {
      exec('npm run register-commands');
    } catch (error) {
      console.error('Error al registrar comandos:', error);
    }
    return product;
  }

  @ApiOperation({ summary: 'Actualizar un producto por ID' })
  @ApiOkResponse({
    description: 'Producto actualizado correctamente',
    type: Product,
  })
  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productService.update(+id, updateProductDto);
    try {
      exec('npm run register-commands');
    } catch (error) {
      console.error('Error al registrar comandos:', error);
    }
    return product;
  }

  @ApiOperation({ summary: 'Eliminar un producto por ID' })
  @ApiOkResponse({
    description: 'Producto eliminado correctamente',
    type: DeleteResult,
  })
  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string): Promise<DeleteResult> {
    return this.productService.remove(+id);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { Product } from './entities/product.entity';
import { User } from '../user/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  calculatePrice(product: Product): number {
    if (!product.stock || !product.totalSlots || !product.scarcityMultiplier) {
      return product.basePrice;
    }

    const emptySlots = product.totalSlots - product.stock;
    return (
      (product.totalSlots / emptySlots) *
      product.scarcityMultiplier *
      product.basePrice
    );
  }

  async create(
    createProductDto: CreateProductDto,
    user: User,
  ): Promise<Product> {
    const newProduct = this.productRepository.create({
      ...createProductDto,
      creator: user,
    });
    return this.productRepository.save(newProduct);
  }

  async findAll(
    limit: number,
    offset: number,
  ): Promise<{ products: Product[]; total: number }> {
    const [products, total] = await this.productRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const productsWithPrice = products.map((product) => ({
      ...product,
      currentPrice: this.calculatePrice(product),
    }));

    return {
      products: productsWithPrice,
      total,
    };
  }

  async findForDiscordAutocomplete(
    search: string,
  ): Promise<Array<{ name: string; value: string }>> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .where('LOWER(product.title) LIKE LOWER(:search)', {
        search: `%${search}%`,
      })
      .andWhere('product.active = true')
      .select([
        'product.id',
        'product.title',
        'product.basePrice',
        'product.stock',
      ]);

    const products = await query.getMany();

    return products.map((product) => {
      const price = this.calculatePrice(product);
      const stockInfo = product.stock === null ? '∞' : product.stock;
      return {
        name: `${product.title} - 💰${price} (Stock: ${stockInfo})`,
        value: String(product.id),
      };
    });
  }

  findOne(id: number): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id },
    });
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  remove(id: number): Promise<DeleteResult> {
    return this.productRepository.delete(id);
  }
}

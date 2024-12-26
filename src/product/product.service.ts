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

  async findAll(limit: number, offset: number): Promise<Product[]> {
    const products = await this.productRepository.find({
      order: { createdAt: 'ASC' },
      relations: ['creator'],
      skip: offset,
      take: limit,
    });

    return products.map((product) => {
      const calculatedPrice = this.calculatePrice(product);
      return { ...product, currentPrice: calculatedPrice };
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

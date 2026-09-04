import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto, UpdateProductDto } from '../api/products/dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: {
        userId_sku: {
          userId,
          sku: dto.sku,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Product with SKU ${dto.sku} already exists`);
    }

    return this.prisma.product.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      deletedAt: null, // Only active products
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as any } },
          { sku: { contains: search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const product = await this.findOne(userId, id); // validates ownership and existence

    return this.prisma.product.update({
      where: { id: product.id },
      data: dto,
    });
  }

  async softDelete(userId: string, id: string) {
    const product = await this.findOne(userId, id);

    await this.prisma.product.update({
      where: { id: product.id },
      data: { deletedAt: new Date() },
    });
  }
}

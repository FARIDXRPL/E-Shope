import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ─── Create ───────────────────────────────────────────────
  async create(dto: CreateProductDto, currentUser: any) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
        sellerId: currentUser.id,
      },
      include: {
        category: true,
        seller: { select: { id: true, name: true, email: true } },
      },
    });

    return { message: 'Produk berhasil dibuat', data: product };
  }

  // ─── Upload Images ────────────────────────────────────────
  async uploadImages(
    id: number,
    files: Express.Multer.File[],
    currentUser: any,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    if (
      currentUser.role !== Role.ADMIN &&
      product.sellerId !== currentUser.id
    ) {
      throw new ForbiddenException('Tidak punya akses');
    }

    const urls = await this.cloudinaryService.uploadProductImages(files, id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { images: JSON.stringify(urls) },
    });

    return {
      message: 'Gambar produk berhasil diupload',
      data: { images: urls },
    };
  }

  // ─── Find All ─────────────────────────────────────────────
  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId: Number(categoryId) }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: Number(minPrice) }),
          ...(maxPrice !== undefined && { lte: Number(maxPrice) }),
        },
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      message: 'Berhasil mengambil data produk',
      data: {
        products,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // ─── Find One ─────────────────────────────────────────────
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        seller: { select: { id: true, name: true, email: true } },
      },
    });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    return { message: 'Berhasil mengambil data produk', data: product };
  }

  // ─── Find My Products ─────────────────────────────────────
  async findMyProducts(query: QueryProductDto, currentUser: any) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      sellerId: currentUser.id,
      ...(search && { name: { contains: search } }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      message: 'Berhasil mengambil produk saya',
      data: {
        products,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // ─── Update ───────────────────────────────────────────────
  async update(id: number, dto: UpdateProductDto, currentUser: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    if (
      currentUser.role !== Role.ADMIN &&
      product.sellerId !== currentUser.id
    ) {
      throw new ForbiddenException('Tidak punya akses');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { ...dto },
      include: {
        category: true,
        seller: { select: { id: true, name: true } },
      },
    });

    return { message: 'Produk berhasil diupdate', data: updated };
  }

  // ─── Delete ───────────────────────────────────────────────
  async remove(id: number, currentUser: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');

    if (
      currentUser.role !== Role.ADMIN &&
      product.sellerId !== currentUser.id
    ) {
      throw new ForbiddenException('Tidak punya akses');
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Produk berhasil dihapus', data: null };
  }
}
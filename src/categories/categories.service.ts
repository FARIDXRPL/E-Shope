import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // ─── Slugify helper ───────────────────────────────────────
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/[^\w-]+/g, '');
  }

  // ─── Create ───────────────────────────────────────────────
  async create(dto: CreateCategoryDto) {
    const slug = this.slugify(dto.name);

    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('Kategori sudah ada');
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
      },
    });

    return {
      message: 'Kategori berhasil dibuat',
      data: category,
    };
  }

  // ─── Find All ─────────────────────────────────────────────
  async findAll(query: PaginationDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        name: { contains: search },
      }),
    };

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      message: 'Berhasil mengambil data kategori',
      data: {
        categories,
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return {
      message: 'Berhasil mengambil data kategori',
      data: category,
    };
  }

  // ─── Update ───────────────────────────────────────────────
  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    const data: any = { ...dto };

    if (dto.name) {
      const slug = this.slugify(dto.name);

      const existing = await this.prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException('Nama kategori sudah dipakai');
      }

      data.slug = slug;
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
    });

    return {
      message: 'Kategori berhasil diupdate',
      data: updated,
    };
  }

  // ─── Delete ───────────────────────────────────────────────
  async remove(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    await this.prisma.category.delete({ where: { id } });

    return {
      message: 'Kategori berhasil dihapus',
      data: null,
    };
  }
}
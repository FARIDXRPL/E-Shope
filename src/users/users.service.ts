import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Role } from '../common/enums/role.enum';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatar: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ─── Create ───────────────────────────────────────────────
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        role: dto.role,
      },
      select: safeUserSelect,
    });

    return { message: 'User berhasil dibuat', data: user };
  }

  // ─── Find All ─────────────────────────────────────────────
  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, role } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
      ...(role && { role }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: safeUserSelect,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      message: 'Berhasil mengambil data users',
      data: {
        users,
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return { message: 'Berhasil mengambil data user', data: user };
  }

  // ─── Find Me ──────────────────────────────────────────────
  async findMe(userId: number) {
    return this.findOne(userId);
  }

  // ─── Update ───────────────────────────────────────────────
  async update(id: number, dto: UpdateUserDto, currentUser: any) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Tidak punya akses');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });

    return { message: 'User berhasil diupdate', data: updated };
  }

  // ─── Upload Avatar ────────────────────────────────────────
  async uploadAvatar(id: number, file: Express.Multer.File, currentUser: any) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Tidak punya akses');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const avatarUrl = await this.cloudinaryService.uploadAvatar(file, id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: safeUserSelect,
    });

    return {
      message: 'Avatar berhasil diupload',
      data: updated,
    };
  }

  // ─── Delete ───────────────────────────────────────────────
  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User berhasil dihapus', data: null };
  }
}
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartsService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper: get or create cart ───────────────────────────
  private async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  // ─── Get My Cart ──────────────────────────────────────────
  async getMyCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);

    const cartWithItems = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                stock: true,
                isActive: true,
                seller: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Hitung total harga
    const totalPrice = cartWithItems!.items.reduce((acc, item) => {
      return acc + item.product.price * item.quantity;
    }, 0);

    return {
      message: 'Berhasil mengambil data keranjang',
      data: {
        ...cartWithItems,
        totalPrice,
        totalItems: cartWithItems!.items.length,
      },
    };
  }

  // ─── Add Item to Cart ─────────────────────────────────────
  async addItem(dto: AddCartDto, userId: number) {
    // Cek produk ada dan aktif
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    // Cek stok cukup
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Stok tidak cukup. Stok tersedia: ${product.stock}`,
      );
    }

    const cart = await this.getOrCreateCart(userId);

    // Cek apakah produk sudah ada di cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      // Update quantity kalau sudah ada
      const newQty = existingItem.quantity + dto.quantity;

      if (product.stock < newQty) {
        throw new BadRequestException(
          `Stok tidak cukup. Stok tersedia: ${product.stock}`,
        );
      }

      const updated = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
        include: { product: { select: { id: true, name: true, price: true } } },
      });

      return {
        message: 'Quantity produk diupdate di keranjang',
        data: updated,
      };
    }

    // Tambah item baru ke cart
    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },
      include: {
        product: { select: { id: true, name: true, price: true } },
      },
    });

    return {
      message: 'Produk berhasil ditambahkan ke keranjang',
      data: item,
    };
  }

  // ─── Update Item Quantity ─────────────────────────────────
  async updateItem(itemId: number, dto: UpdateCartDto, userId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    });

    if (!item) {
      throw new NotFoundException('Item tidak ditemukan di keranjang');
    }

    // Pastikan item milik user ini
    if (item.cart.userId !== userId) {
      throw new ForbiddenException('Tidak punya akses');
    }

    // Cek stok
    if (item.product.stock < dto.quantity) {
      throw new BadRequestException(
        `Stok tidak cukup. Stok tersedia: ${item.product.stock}`,
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
      include: {
        product: { select: { id: true, name: true, price: true } },
      },
    });

    return {
      message: 'Quantity berhasil diupdate',
      data: updated,
    };
  }

  // ─── Remove Item from Cart ────────────────────────────────
  async removeItem(itemId: number, userId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundException('Item tidak ditemukan di keranjang');
    }

    if (item.cart.userId !== userId) {
      throw new ForbiddenException('Tidak punya akses');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return {
      message: 'Produk berhasil dihapus dari keranjang',
      data: null,
    };
  }

  // ─── Clear Cart ───────────────────────────────────────────
  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });

    if (!cart) {
      throw new NotFoundException('Keranjang tidak ditemukan');
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return {
      message: 'Keranjang berhasil dikosongkan',
      data: null,
    };
  }
}
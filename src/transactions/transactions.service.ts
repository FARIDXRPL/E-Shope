import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { Role } from '../common/enums/role.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';

// Include lengkap untuk detail transaksi
const transactionInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          seller: { select: { id: true, name: true } },
        },
      },
    },
  },
  user: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Checkout ─────────────────────────────────────────────
  async checkout(dto: CheckoutDto, userId: number) {
    let itemsToCheckout: { productId: number; quantity: number }[] = [];

    if (dto.items && dto.items.length > 0) {
      // Checkout dari item yang dipilih manual
      itemsToCheckout = dto.items;
    } else {
      // Checkout dari semua item di keranjang
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Keranjang kosong');
      }

      itemsToCheckout = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
    }

    // Validasi semua produk & stok
    const products = await Promise.all(
      itemsToCheckout.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundException(
            `Produk ID ${item.productId} tidak ditemukan`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stok produk "${product.name}" tidak cukup. Tersedia: ${product.stock}`,
          );
        }

        return { product, quantity: item.quantity };
      }),
    );

    // Hitung total harga
    const totalPrice = products.reduce(
      (acc, { product, quantity }) => acc + product.price * quantity,
      0,
    );

    // Buat transaksi + items dalam satu transaction Prisma
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Buat transaksi
      const newTransaction = await tx.transaction.create({
        data: {
          userId,
          totalPrice,
          status: TransactionStatus.PENDING,
          items: {
            create: products.map(({ product, quantity }) => ({
              productId: product.id,
              quantity,
              price: product.price, // snapshot harga saat checkout
            })),
          },
        },
        include: transactionInclude,
      });

      // Kurangi stok produk
      await Promise.all(
        products.map(({ product, quantity }) =>
          tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: quantity } },
          }),
        ),
      );

      // Kosongkan keranjang setelah checkout
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return newTransaction;
    });

    return {
      message: 'Checkout berhasil',
      data: transaction,
    };
  }

  // ─── Find All (Admin) ─────────────────────────────────────
  async findAll(query: QueryTransactionDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: transactionInclude,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      message: 'Berhasil mengambil data transaksi',
      data: {
        transactions,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // ─── Find My Transactions (Buyer) ─────────────────────────
  async findMyTransactions(query: QueryTransactionDto, userId: number) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: transactionInclude,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      message: 'Berhasil mengambil data transaksi saya',
      data: {
        transactions,
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
  async findOne(id: number, currentUser: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    // Hanya admin atau pemilik transaksi yang bisa lihat
    if (
      currentUser.role !== Role.ADMIN &&
      transaction.userId !== currentUser.id
    ) {
      throw new ForbiddenException('Tidak punya akses');
    }

    return {
      message: 'Berhasil mengambil detail transaksi',
      data: transaction,
    };
  }

  // ─── Update Status (Admin) ────────────────────────────────
  async updateStatus(id: number, dto: UpdateTransactionDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { status: dto.status },
      include: transactionInclude,
    });

    return {
      message: 'Status transaksi berhasil diupdate',
      data: updated,
    };
  }

  // ─── Cancel Transaction (Buyer) ───────────────────────────
  async cancel(id: number, userId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Tidak punya akses');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        'Hanya transaksi dengan status PENDING yang bisa dibatalkan',
      );
    }

    // Kembalikan stok produk
    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: { status: TransactionStatus.CANCELLED },
      });

      await Promise.all(
        transaction.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );
    });

    return {
      message: 'Transaksi berhasil dibatalkan',
      data: null,
    };
  }
}
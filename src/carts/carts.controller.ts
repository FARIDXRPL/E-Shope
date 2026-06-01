import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('carts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BUYER, Role.ADMIN)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  // GET /api/carts — Lihat isi keranjang
  @Get()
  getMyCart(@GetUser('id') userId: number) {
    return this.cartsService.getMyCart(userId);
  }

  // POST /api/carts — Tambah produk ke keranjang
  @Post()
  addItem(@Body() dto: AddCartDto, @GetUser('id') userId: number) {
    return this.cartsService.addItem(dto, userId);
  }

  // PATCH /api/carts/:itemId — Update quantity item
  @Patch(':itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartDto,
    @GetUser('id') userId: number,
  ) {
    return this.cartsService.updateItem(itemId, dto, userId);
  }

  // DELETE /api/carts/:itemId — Hapus item dari keranjang
  @Delete(':itemId')
  removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @GetUser('id') userId: number,
  ) {
    return this.cartsService.removeItem(itemId, userId);
  }

  // DELETE /api/carts — Kosongkan semua keranjang
  @Delete()
  clearCart(@GetUser('id') userId: number) {
    return this.cartsService.clearCart(userId);
  }
}
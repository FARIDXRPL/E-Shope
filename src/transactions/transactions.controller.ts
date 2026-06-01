import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // POST /api/transactions/checkout — Buyer
  @Post('checkout')
  @Roles(Role.BUYER, Role.ADMIN)
  checkout(@Body() dto: CheckoutDto, @GetUser('id') userId: number) {
    return this.transactionsService.checkout(dto, userId);
  }

  // GET /api/transactions — Admin only
  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryTransactionDto) {
    return this.transactionsService.findAll(query);
  }

  // GET /api/transactions/me — Buyer (transaksi sendiri)
  @Get('me')
  @Roles(Role.BUYER, Role.ADMIN)
  findMyTransactions(
    @Query() query: QueryTransactionDto,
    @GetUser('id') userId: number,
  ) {
    return this.transactionsService.findMyTransactions(query, userId);
  }

  // GET /api/transactions/:id — Admin atau pemilik transaksi
  @Get(':id')
  @Roles(Role.BUYER, Role.ADMIN)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: any,
  ) {
    return this.transactionsService.findOne(id, currentUser);
  }

  // PATCH /api/transactions/:id/status — Admin only
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.updateStatus(id, dto);
  }

  // PATCH /api/transactions/:id/cancel — Buyer
  @Patch(':id/cancel')
  @Roles(Role.BUYER)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.transactionsService.cancel(id, userId);
  }
}
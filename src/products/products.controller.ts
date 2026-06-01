import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,       // ← tambah
  UploadedFiles,         // ← tambah
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express'; // ← tambah
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/role.enum';
import { multerImageConfig } from '../helper/multer.config'; // ← tambah

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // POST /api/products — Seller & Admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  create(@Body() dto: CreateProductDto, @GetUser() currentUser: any) {
    return this.productsService.create(dto, currentUser);
  }

  // GET /api/products — Public
  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  // GET /api/products/me — Seller
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  findMyProducts(@Query() query: QueryProductDto, @GetUser() currentUser: any) {
    return this.productsService.findMyProducts(query, currentUser);
  }

  // GET /api/products/:id — Public
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // PATCH /api/products/:id — Seller pemilik & Admin
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @GetUser() currentUser: any,
  ) {
    return this.productsService.update(id, dto, currentUser);
  }

  // PATCH /api/products/:id/images — Seller pemilik & Admin ← BARU
  @Patch(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5, multerImageConfig))
  uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() currentUser: any,
  ) {
    return this.productsService.uploadImages(id, files, currentUser);
  }

  // DELETE /api/products/:id — Seller pemilik & Admin
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() currentUser: any) {
    return this.productsService.remove(id, currentUser);
  }
}
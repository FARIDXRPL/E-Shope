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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/role.enum';
import { multerImageConfig } from '../helper/multer.config';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users — Admin only
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // GET /api/users — Admin only
  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  // GET /api/users/me
  @Get('me')
  findMe(@GetUser('id') userId: number) {
    return this.usersService.findMe(userId);
  }

  // GET /api/users/:id — Admin only
  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // PATCH /api/users/:id — Update data user
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @GetUser() currentUser: any,
  ) {
    return this.usersService.update(id, dto, currentUser);
  }

  // POST /api/users/:id/avatar — Upload avatar (terpisah)
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', multerImageConfig))
  uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() currentUser: any,
  ) {
    return this.usersService.uploadAvatar(id, file, currentUser);
  }

  // DELETE /api/users/:id — Admin only
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
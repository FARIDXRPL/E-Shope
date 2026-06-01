import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

export class QueryTransactionDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}
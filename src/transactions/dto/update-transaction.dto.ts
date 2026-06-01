import { IsEnum, IsNotEmpty } from 'class-validator';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

export class UpdateTransactionDto {
  @IsNotEmpty()
  @IsEnum(TransactionStatus)
  status!: TransactionStatus;
}
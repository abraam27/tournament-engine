import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { GroupStatus } from '../enums/group-status.enum';

export class CreateGroupDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  tournamentId: string;

  @ApiProperty({ example: 'Group A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ enum: GroupStatus, default: GroupStatus.PENDING })
  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;
}

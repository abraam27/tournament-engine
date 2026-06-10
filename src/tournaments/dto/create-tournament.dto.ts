import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TournamentStatus } from '../enums/tournament-status.enum';

export class CreateTournamentDto {
  @ApiProperty({ example: 'FIFA World Cup 2026' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(1930)
  year: number;

  @ApiPropertyOptional({ enum: TournamentStatus, default: TournamentStatus.DRAFT })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @ApiPropertyOptional({ example: 48, default: 48 })
  @IsOptional()
  @IsInt()
  @Min(1)
  teamsCount?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  groupsCount?: number;

  @ApiPropertyOptional({ example: 4, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  teamsPerGroup?: number;

  @ApiPropertyOptional({ example: 2, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  qualifiedPerGroup?: number;

  @ApiPropertyOptional({ example: 8, default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bestThirdCount?: number;
}

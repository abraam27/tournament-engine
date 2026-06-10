import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MatchStatus } from '../enums/match-status.enum';
import { NextMatchSlot } from '../enums/next-match-slot.enum';

export class UpdateMatchDto {
  @ApiPropertyOptional({ example: '2026-06-15T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  matchDate?: string;

  @ApiPropertyOptional({ example: 'MetLife Stadium' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stadium?: string;

  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  winnerTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  loserTeamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  nextMatchId?: string;

  @ApiPropertyOptional({ enum: NextMatchSlot })
  @IsOptional()
  @IsEnum(NextMatchSlot)
  nextMatchSlot?: NextMatchSlot;
}

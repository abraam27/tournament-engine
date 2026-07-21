import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { MatchRound } from '../enums/match-round.enum';
import { MatchStatus } from '../enums/match-status.enum';
import { NextMatchSlot } from '../enums/next-match-slot.enum';

export class CreateMatchDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  tournamentId: string;

  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d9' })
  @IsOptional()
  @IsMongoId()
  stageId?: string;

  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d2' })
  @ValidateIf((dto: CreateMatchDto) => dto.round === MatchRound.GROUP)
  @IsMongoId()
  groupId?: string;

  @ApiProperty({ enum: MatchRound, example: MatchRound.GROUP })
  @IsEnum(MatchRound)
  round: MatchRound;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  matchNumber: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Bracket slot order within the round (Round of 32 through Semi-finals)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  bracketPosition?: number;

  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  @ValidateIf((dto: CreateMatchDto) => !!dto.homeTeamId || dto.round === MatchRound.GROUP)
  @IsMongoId()
  homeTeamId?: string;

  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d4' })
  @ValidateIf((dto: CreateMatchDto) => !!dto.awayTeamId || dto.round === MatchRound.GROUP)
  @IsMongoId()
  awayTeamId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore?: number;

  @ApiPropertyOptional({ enum: MatchStatus, default: MatchStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ example: '2026-06-15T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  matchDate?: string;

  @ApiPropertyOptional({ example: 'MetLife Stadium' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stadium?: string;

  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  @IsOptional()
  @IsMongoId()
  winnerTeamId?: string;

  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d4' })
  @IsOptional()
  @IsMongoId()
  loserTeamId?: string;

  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d5' })
  @IsOptional()
  @IsMongoId()
  nextMatchId?: string;

  @ApiPropertyOptional({ enum: NextMatchSlot })
  @IsOptional()
  @IsEnum(NextMatchSlot)
  nextMatchSlot?: NextMatchSlot;
}

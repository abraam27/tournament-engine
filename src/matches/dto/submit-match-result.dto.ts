import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

export class SubmitMatchResultDto {
  @ApiProperty({ example: 2, minimum: 0 })
  @IsInt()
  @Min(0)
  homeScore: number;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  awayScore: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasExtraTime?: boolean;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @ValidateIf((dto: SubmitMatchResultDto) => dto.hasExtraTime === true)
  @IsInt()
  @Min(0)
  extraTimeHomeScore?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @ValidateIf((dto: SubmitMatchResultDto) => dto.hasExtraTime === true)
  @IsInt()
  @Min(0)
  extraTimeAwayScore?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasPenalties?: boolean;

  @ApiPropertyOptional({ example: 5, minimum: 0 })
  @ValidateIf((dto: SubmitMatchResultDto) => dto.hasPenalties === true)
  @IsInt()
  @Min(0)
  penaltiesHomeScore?: number;

  @ApiPropertyOptional({ example: 4, minimum: 0 })
  @ValidateIf((dto: SubmitMatchResultDto) => dto.hasPenalties === true)
  @IsInt()
  @Min(0)
  penaltiesAwayScore?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Confederation } from '../enums/confederation.enum';

export class CreateTeamDto {
  @ApiProperty({ example: 'Egypt' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'EGY' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'code must be exactly 3 uppercase letters',
  })
  code: string;

  @ApiPropertyOptional({ example: 'https://example.com/flags/egy.png' })
  @IsOptional()
  @IsUrl()
  flagUrl?: string;

  @ApiPropertyOptional({ enum: Confederation, example: Confederation.CAF })
  @IsOptional()
  @IsEnum(Confederation)
  confederation?: Confederation;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsInt()
  @Min(1)
  fifaRanking?: number;
}

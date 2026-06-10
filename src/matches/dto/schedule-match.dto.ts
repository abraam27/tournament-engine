import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class ScheduleMatchDto {
  @ApiProperty({ example: '2026-06-11T21:00:00+03:00' })
  @IsDateString()
  matchDate: string;

  @ApiProperty({ example: 'Estadio Azteca' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  stadium: string;
}

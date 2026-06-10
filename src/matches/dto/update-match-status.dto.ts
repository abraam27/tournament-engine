import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MatchStatus } from '../enums/match-status.enum';

export class UpdateMatchStatusDto {
  @ApiProperty({
    enum: MatchStatus,
    example: MatchStatus.LIVE,
  })
  @IsEnum(MatchStatus)
  status: MatchStatus;
}

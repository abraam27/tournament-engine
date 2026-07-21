import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { MatchRound } from 'src/matches/enums/match-round.enum';

export const RESETTABLE_KNOCKOUT_ROUNDS = [
  MatchRound.ROUND_32,
  MatchRound.ROUND_16,
  MatchRound.QUARTER_FINAL,
  MatchRound.SEMI_FINAL,
] as const;

export class ResetKnockoutFromStageDto {
  @ApiProperty({
    enum: RESETTABLE_KNOCKOUT_ROUNDS,
    example: MatchRound.ROUND_16,
    description:
      'Delete this round and all later knockout rounds, then optionally regenerate',
  })
  @IsEnum(RESETTABLE_KNOCKOUT_ROUNDS)
  fromRound: (typeof RESETTABLE_KNOCKOUT_ROUNDS)[number];

  @ApiPropertyOptional({
    default: true,
    description:
      'When true, recreate matches from this stage using bracket templates and re-apply feeder results',
  })
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

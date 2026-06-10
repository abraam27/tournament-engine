import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MatchRound } from 'src/matches/enums/match-round.enum';

const GENERATABLE_ROUNDS = [
  MatchRound.ROUND_32,
  MatchRound.ROUND_16,
  MatchRound.QUARTER_FINAL,
  MatchRound.SEMI_FINAL,
] as const;

export class GenerateNextRoundDto {
  @ApiProperty({
    enum: GENERATABLE_ROUNDS,
    example: MatchRound.ROUND_32,
  })
  @IsEnum(GENERATABLE_ROUNDS)
  currentRound: (typeof GENERATABLE_ROUNDS)[number];
}

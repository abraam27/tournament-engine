import { MatchRound } from '../enums/match-round.enum';

export const BRACKET_POSITION_ROUNDS: MatchRound[] = [
  MatchRound.ROUND_32,
  MatchRound.ROUND_16,
  MatchRound.QUARTER_FINAL,
  MatchRound.SEMI_FINAL,
];

export function isBracketPositionRound(round: MatchRound | string): boolean {
  return BRACKET_POSITION_ROUNDS.includes(round as MatchRound);
}

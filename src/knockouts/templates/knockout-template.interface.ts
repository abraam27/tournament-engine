import { MatchRound } from 'src/matches/enums/match-round.enum';

export interface KnockoutTemplateMatch {
  matchNumber: number;
  homeSource: string;
  awaySource: string;
  matchDate?: string;
  stadium?: string;
}

export interface RoundTemplate {
  round: MatchRound;
  matches: KnockoutTemplateMatch[];
}

import { MatchRound } from 'src/matches/enums/match-round.enum';
import { BracketSourceType } from 'src/bracket-slots/enums/bracket-source-type.enum';

export interface ResolvedSourceRef {
  teamId: string;
  sourceType: BracketSourceType;
  sourceRef: string;
}

export interface ResolvedTemplateMatch {
  round: MatchRound;
  matchNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeSourceRef: string;
  awaySourceRef: string;
  homeSourceType: BracketSourceType;
  awaySourceType: BracketSourceType;
  matchDate?: Date;
  stadium?: string;
}

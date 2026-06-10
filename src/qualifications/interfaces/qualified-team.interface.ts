import { QualificationType } from '../enums/qualification-type.enum';
import { StandingTeamInfo } from 'src/standings/interfaces/standing-row.interface';

export interface AutomaticQualifiedTeam {
  sourceRef: string;
  qualificationType: QualificationType.GROUP_RANK;
  groupId: string;
  groupCode: string;
  rank: number;
  teamId: string;
  team: StandingTeamInfo;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

export interface BestThirdQualifiedTeam {
  sourceRef: string;
  qualificationType: QualificationType.BEST_THIRD;
  originalGroupSourceRef: string;
  groupId: string;
  groupCode: string;
  rank: number;
  teamId: string;
  team: StandingTeamInfo;
  points: number;
  goalDifference: number;
  goalsFor: number;
  thirdPlaceRank: number;
}

export interface ThirdPlaceRankingEntry {
  thirdPlaceRank: number;
  qualified: boolean;
  originalGroupSourceRef: string;
  groupId: string;
  groupCode: string;
  teamId: string;
  team: StandingTeamInfo;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

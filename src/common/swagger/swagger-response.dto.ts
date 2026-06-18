import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StandingRowDto } from 'src/standings/dto/standing-row.dto';

export class TournamentResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  _id: string;

  @ApiProperty({ example: 'FIFA World Cup 2026' })
  name: string;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 'draft' })
  status: string;

  @ApiProperty({ example: 48 })
  teamsCount: number;

  @ApiProperty({ example: 12 })
  groupsCount: number;

  @ApiProperty({ example: 4 })
  teamsPerGroup: number;
}

export class TeamResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  _id: string;

  @ApiProperty({ example: 'Egypt' })
  name: string;

  @ApiProperty({ example: 'EGY' })
  code: string;

  @ApiPropertyOptional({ example: 'https://flagcdn.com/16x12/eg.png' })
  flagUrl?: string;

  @ApiPropertyOptional({ example: 'CAF' })
  confederation?: string;
}

export class GroupResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d2' })
  _id: string;

  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  tournamentId: string;

  @ApiProperty({ example: 'Group A' })
  name: string;

  @ApiProperty({ example: 'A' })
  code: string;

  @ApiProperty({ example: 'pending' })
  status: string;
}

export class MatchTeamResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  _id: string;

  @ApiProperty({ example: 'Egypt' })
  name: string;

  @ApiProperty({ example: 'EGY' })
  code: string;

  @ApiPropertyOptional({ example: 'https://flagcdn.com/16x12/eg.png' })
  flagUrl?: string;
}

export class MatchResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d7' })
  _id: string;

  @ApiProperty({ example: 1 })
  matchNumber: number;

  @ApiProperty({ example: 'group' })
  round: string;

  @ApiProperty({ type: MatchTeamResponseDto })
  homeTeamId: MatchTeamResponseDto;

  @ApiProperty({ type: MatchTeamResponseDto })
  awayTeamId: MatchTeamResponseDto;

  @ApiPropertyOptional({ example: 2 })
  homeScore?: number;

  @ApiPropertyOptional({ example: 1 })
  awayScore?: number;

  @ApiProperty({ example: 'completed' })
  status: string;
}

export class GroupStandingsResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d2' })
  groupId: string;

  @ApiProperty({
    example: { _id: '64f1a2b3c4d5e6f7a8b9c0d2', name: 'Group A', code: 'A' },
  })
  group: { _id: string; name: string; code: string };

  @ApiProperty({ type: [StandingRowDto] })
  standings: StandingRowDto[];
}

export class QualifiedTeamsResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  tournamentId: string;

  @ApiProperty({ example: 32 })
  totalQualified: number;

  @ApiProperty({
    example: { A1: '64f1a2b3c4d5e6f7a8b9c0d3', BEST_THIRD_1: '64f1a2b3c4d5e6f7a8b9c0d4' },
  })
  qualifiedMap: Record<string, string>;
}

export class BracketSlotResponseDto {
  @ApiProperty({ example: 'home' })
  slot: string;

  @ApiProperty({ example: 'group_rank' })
  sourceType: string;

  @ApiProperty({ example: 'A1' })
  sourceRef: string;

  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  teamId: string;
}

export class BracketMatchResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d7' })
  matchId: string;

  @ApiProperty({ example: 73 })
  matchNumber: number;

  @ApiProperty({ type: MatchTeamResponseDto })
  homeTeam: MatchTeamResponseDto;

  @ApiProperty({ type: MatchTeamResponseDto })
  awayTeam: MatchTeamResponseDto;

  @ApiProperty({ example: 'scheduled' })
  status: string;

  @ApiProperty({ type: [BracketSlotResponseDto] })
  slots: BracketSlotResponseDto[];
}

export class ThirdPlaceRankingEntryDto {
  @ApiProperty({ example: 'A3' })
  sourceRef: string;

  @ApiProperty({ example: 'Group A' })
  groupName: string;

  @ApiProperty({ example: 'A' })
  groupCode: string;

  @ApiProperty({ example: 1 })
  thirdPlaceRank: number;

  @ApiProperty({ example: true })
  qualified: boolean;

  @ApiProperty({ type: StandingRowDto })
  standing: StandingRowDto;
}

export class ThirdPlaceRankingResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  tournamentId: string;

  @ApiProperty({ type: [ThirdPlaceRankingEntryDto] })
  ranking: ThirdPlaceRankingEntryDto[];
}

export class KnockoutBracketResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  tournamentId: string;

  @ApiProperty({
    example: {
      round_32: [],
      round_16: [],
      quarter_final: [],
      semi_final: [],
      third_place: [],
      final: [],
    },
  })
  rounds: Record<string, unknown[]>;
}

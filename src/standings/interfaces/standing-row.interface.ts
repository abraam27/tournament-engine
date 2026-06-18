export interface StandingTeamInfo {
  _id: string;
  name: string;
  code: string;
  flagUrl?: string;
}

export interface StandingTeamInput {
  teamId: string;
  team: StandingTeamInfo;
}

export interface StandingMatchInput {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  teamId: string;
  team: StandingTeamInfo;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
}

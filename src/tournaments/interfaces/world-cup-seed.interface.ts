import { Confederation } from 'src/teams/enums/confederation.enum';

export interface WorldCupSeedTeam {
  name: string;
  code: string;
  confederation: Confederation;
  status?: string;
  fifaRanking?: number;
  flagUrl?: string;
}

export interface WorldCupSeedGroup {
  group: string;
  teams: WorldCupSeedTeam[];
}

export interface WorldCupSeedData {
  tournament: string;
  groups: WorldCupSeedGroup[];
}

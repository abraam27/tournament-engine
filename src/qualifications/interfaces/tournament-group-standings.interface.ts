import { StandingRow } from 'src/standings/interfaces/standing-row.interface';

export interface TournamentGroupStandings {
  groupId: string;
  group: {
    _id: string;
    name: string;
    code: string;
  };
  standings: StandingRow[];
}

export interface ThirdPlaceCandidate {
  groupId: string;
  groupCode: string;
  originalGroupSourceRef: string;
  standing: StandingRow;
}

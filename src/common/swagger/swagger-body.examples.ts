export const SUBMIT_RESULT_EXAMPLES = {
  groupFullTimeWin: {
    summary: 'Group match full-time win',
    value: { homeScore: 2, awayScore: 1 },
  },
  knockoutFullTimeWin: {
    summary: 'Knockout full-time win',
    value: { homeScore: 2, awayScore: 1 },
  },
  knockoutExtraTimeWin: {
    summary: 'Knockout extra-time win',
    value: {
      homeScore: 1,
      awayScore: 1,
      hasExtraTime: true,
      extraTimeHomeScore: 2,
      extraTimeAwayScore: 1,
    },
  },
  knockoutPenaltiesWin: {
    summary: 'Knockout penalty shootout win',
    value: {
      homeScore: 1,
      awayScore: 1,
      hasExtraTime: true,
      extraTimeHomeScore: 1,
      extraTimeAwayScore: 1,
      hasPenalties: true,
      penaltiesHomeScore: 5,
      penaltiesAwayScore: 4,
    },
  },
};

export const CREATE_TOURNAMENT_EXAMPLE = {
  name: 'FIFA World Cup 2026',
  year: 2026,
  teamsCount: 48,
  groupsCount: 12,
  teamsPerGroup: 4,
  qualifiedPerGroup: 2,
  bestThirdCount: 8,
};

export const CREATE_TEAM_EXAMPLE = {
  name: 'Egypt',
  code: 'EGY',
  confederation: 'CAF',
  fifaRanking: 36,
};

export const CREATE_GROUP_EXAMPLE = {
  tournamentId: '64f1a2b3c4d5e6f7a8b9c0d1',
  name: 'Group A',
  code: 'A',
};

export const ASSIGN_TEAM_EXAMPLE = {
  teamId: '64f1a2b3c4d5e6f7a8b9c0d3',
  seed: 1,
};

export const GENERATE_NEXT_ROUND_EXAMPLE = {
  currentRound: 'round_32',
};

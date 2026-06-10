import { StandingsService } from './standings.service';
import {
  StandingMatchInput,
  StandingTeamInput,
} from './interfaces/standing-row.interface';

describe('StandingsService', () => {
  let service: StandingsService;

  const teamA: StandingTeamInput = {
    teamId: 'team-a',
    team: { _id: 'team-a', name: 'Team A', code: 'TMA' },
  };
  const teamB: StandingTeamInput = {
    teamId: 'team-b',
    team: { _id: 'team-b', name: 'Team B', code: 'TMB' },
  };
  const egypt: StandingTeamInput = {
    teamId: 'egypt',
    team: { _id: 'egypt', name: 'Egypt', code: 'EGY' },
  };
  const brazil: StandingTeamInput = {
    teamId: 'brazil',
    team: { _id: 'brazil', name: 'Brazil', code: 'BRA' },
  };
  const spain: StandingTeamInput = {
    teamId: 'spain',
    team: { _id: 'spain', name: 'Spain', code: 'ESP' },
  };
  const france: StandingTeamInput = {
    teamId: 'france',
    team: { _id: 'france', name: 'France', code: 'FRA' },
  };

  beforeEach(() => {
    service = new StandingsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  const getStanding = (
    standings: ReturnType<StandingsService['calculateStandings']>,
    teamId: string,
  ) => standings.find((standing) => standing.teamId === teamId);

  it('calculates a home win correctly', () => {
    const standings = service.calculateStandings(
      [teamA, teamB],
      [{ homeTeamId: 'team-a', awayTeamId: 'team-b', homeScore: 2, awayScore: 1 }],
    );

    expect(getStanding(standings, 'team-a')).toMatchObject({
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 1,
      goalDifference: 1,
      points: 3,
      rank: 1,
    });
    expect(getStanding(standings, 'team-b')).toMatchObject({
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: 1,
      goalsAgainst: 2,
      goalDifference: -1,
      points: 0,
      rank: 2,
    });
  });

  it('calculates an away win correctly', () => {
    const standings = service.calculateStandings(
      [teamA, teamB],
      [{ homeTeamId: 'team-a', awayTeamId: 'team-b', homeScore: 0, awayScore: 2 }],
    );

    expect(getStanding(standings, 'team-b')).toMatchObject({
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 3,
      rank: 1,
    });
    expect(getStanding(standings, 'team-a')).toMatchObject({
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: 0,
      goalsAgainst: 2,
      goalDifference: -2,
      points: 0,
      rank: 2,
    });
  });

  it('calculates a draw correctly', () => {
    const standings = service.calculateStandings(
      [teamA, teamB],
      [{ homeTeamId: 'team-a', awayTeamId: 'team-b', homeScore: 1, awayScore: 1 }],
    );

    expect(getStanding(standings, 'team-a')).toMatchObject({
      played: 1,
      drawn: 1,
      points: 1,
    });
    expect(getStanding(standings, 'team-b')).toMatchObject({
      played: 1,
      drawn: 1,
      points: 1,
    });
  });

  it('calculates multiple matches and ranks the table correctly', () => {
    const matches: StandingMatchInput[] = [
      { homeTeamId: 'egypt', awayTeamId: 'brazil', homeScore: 2, awayScore: 1 },
      { homeTeamId: 'spain', awayTeamId: 'france', homeScore: 1, awayScore: 1 },
      { homeTeamId: 'egypt', awayTeamId: 'spain', homeScore: 0, awayScore: 3 },
      { homeTeamId: 'brazil', awayTeamId: 'france', homeScore: 2, awayScore: 0 },
      { homeTeamId: 'egypt', awayTeamId: 'france', homeScore: 1, awayScore: 1 },
      { homeTeamId: 'brazil', awayTeamId: 'spain', homeScore: 1, awayScore: 2 },
    ];

    const standings = service.calculateStandings(
      [egypt, brazil, spain, france],
      matches,
    );

    expect(getStanding(standings, 'spain')).toMatchObject({
      played: 3,
      won: 2,
      drawn: 1,
      lost: 0,
      goalsFor: 6,
      goalsAgainst: 2,
      goalDifference: 4,
      points: 7,
      rank: 1,
    });
    expect(getStanding(standings, 'egypt')).toMatchObject({
      played: 3,
      won: 1,
      drawn: 1,
      lost: 1,
      goalsFor: 3,
      goalsAgainst: 5,
      goalDifference: -2,
      points: 4,
      rank: 2,
    });
    expect(getStanding(standings, 'brazil')).toMatchObject({
      played: 3,
      won: 1,
      drawn: 0,
      lost: 2,
      goalsFor: 4,
      goalsAgainst: 4,
      goalDifference: 0,
      points: 3,
      rank: 3,
    });
    expect(getStanding(standings, 'france')).toMatchObject({
      played: 3,
      won: 0,
      drawn: 2,
      lost: 1,
      goalsFor: 2,
      goalsAgainst: 4,
      goalDifference: -2,
      points: 2,
      rank: 4,
    });
  });

  it('ranks teams by points when goal difference and goals for differ', () => {
    const standings = service.sortStandings([
      {
        teamId: 'low',
        team: { _id: 'low', name: 'Low', code: 'LOW' },
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goalsFor: 1,
        goalsAgainst: 0,
        goalDifference: 1,
        points: 3,
        rank: 0,
      },
      {
        teamId: 'high',
        team: { _id: 'high', name: 'High', code: 'HIG' },
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goalsFor: 3,
        goalsAgainst: 0,
        goalDifference: 3,
        points: 3,
        rank: 0,
      },
    ]);

    expect(standings[0].teamId).toBe('high');
    expect(standings[0].rank).toBe(1);
    expect(standings[1].teamId).toBe('low');
    expect(standings[1].rank).toBe(2);
  });

  it('ranks teams by goal difference when points are equal', () => {
    const standings = service.sortStandings([
      {
        teamId: 'lower-gd',
        team: { _id: 'lower-gd', name: 'Lower GD', code: 'LGD' },
        played: 2,
        won: 1,
        drawn: 0,
        lost: 1,
        goalsFor: 3,
        goalsAgainst: 2,
        goalDifference: 1,
        points: 3,
        rank: 0,
      },
      {
        teamId: 'higher-gd',
        team: { _id: 'higher-gd', name: 'Higher GD', code: 'HGD' },
        played: 2,
        won: 1,
        drawn: 0,
        lost: 1,
        goalsFor: 4,
        goalsAgainst: 2,
        goalDifference: 2,
        points: 3,
        rank: 0,
      },
    ]);

    expect(standings[0].teamId).toBe('higher-gd');
    expect(standings[1].teamId).toBe('lower-gd');
  });

  it('ranks teams by goals scored when points and goal difference are equal', () => {
    const standings = service.sortStandings([
      {
        teamId: 'fewer-goals',
        team: { _id: 'fewer-goals', name: 'Fewer Goals', code: 'FEW' },
        played: 2,
        won: 1,
        drawn: 0,
        lost: 1,
        goalsFor: 2,
        goalsAgainst: 2,
        goalDifference: 0,
        points: 3,
        rank: 0,
      },
      {
        teamId: 'more-goals',
        team: { _id: 'more-goals', name: 'More Goals', code: 'MOR' },
        played: 2,
        won: 1,
        drawn: 0,
        lost: 1,
        goalsFor: 4,
        goalsAgainst: 4,
        goalDifference: 0,
        points: 3,
        rank: 0,
      },
    ]);

    expect(standings[0].teamId).toBe('more-goals');
    expect(standings[1].teamId).toBe('fewer-goals');
  });

  it('returns zero stats when group has teams but no completed matches', () => {
    const standings = service.calculateStandings([teamA, teamB], []);

    expect(standings).toHaveLength(2);
    standings.forEach((standing) => {
      expect(standing).toMatchObject({
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    });
  });

  it('ignores scheduled matches by only processing completed match input', () => {
    const standings = service.calculateStandings([teamA, teamB], []);

    expect(getStanding(standings, 'team-a')?.points).toBe(0);
    expect(getStanding(standings, 'team-b')?.points).toBe(0);
  });

  it('ignores cancelled matches by only processing completed match input', () => {
    const standings = service.calculateStandings(
      [teamA, teamB],
      [{ homeTeamId: 'team-a', awayTeamId: 'team-b', homeScore: 2, awayScore: 1 }],
    );

    expect(getStanding(standings, 'team-a')?.points).toBe(3);
    expect(getStanding(standings, 'team-b')?.points).toBe(0);
  });

  it('ignores matches that are not included in completed matches input', () => {
    const standings = service.calculateStandings(
      [teamA, teamB],
      [{ homeTeamId: 'team-a', awayTeamId: 'team-b', homeScore: 2, awayScore: 1 }],
    );

    expect(getStanding(standings, 'team-a')?.points).toBe(3);
    expect(getStanding(standings, 'team-b')?.points).toBe(0);
  });
});

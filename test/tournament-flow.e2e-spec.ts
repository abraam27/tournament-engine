import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  cleanDatabase,
  closeE2eApp,
  createE2eApp,
} from './helpers/e2e-app.helper';

interface TeamResponse {
  _id: string;
  name: string;
  code: string;
}

interface MatchResponse {
  _id: string;
  matchNumber: number;
  round: string;
  homeTeamId: TeamResponse;
  awayTeamId: TeamResponse;
  status: string;
  winnerTeamId?: string;
}

interface StandingRow {
  teamId: string;
  team: { code: string; name: string };
  points: number;
  rank: number;
}

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const teamCodeForGroup = (groupCode: string, seed: number): string => {
  const seedLetter = String.fromCharCode('A'.charCodeAt(0) + seed - 1);
  return `${groupCode}${groupCode}${seedLetter}`;
};

const seedFromTeamCode = (code: string): number =>
  code.charCodeAt(2) - 'A'.charCodeAt(0) + 1;

const deterministicGroupResult = (
  homeCode: string,
  awayCode: string,
): { homeScore: number; awayScore: number } => {
  const homeSeed = seedFromTeamCode(homeCode);
  const awaySeed = seedFromTeamCode(awayCode);

  if (homeSeed < awaySeed) {
    return { homeScore: 1, awayScore: 0 };
  }
  if (awaySeed < homeSeed) {
    return { homeScore: 0, awayScore: 1 };
  }
  return { homeScore: 1, awayScore: 0 };
};

const getTeamCode = (team: TeamResponse | string): string =>
  typeof team === 'string' ? team : team.code;

describe('Tournament flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await closeE2eApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  describe('Basic tournament flow', () => {
    it('runs group stage and verifies standings order', async () => {
      const tournamentRes = await request(app.getHttpServer())
        .post('/tournaments')
        .send({
          name: 'Test Group Tournament',
          year: 2026,
          teamsCount: 4,
          groupsCount: 1,
          teamsPerGroup: 4,
        })
        .expect(201);

      const tournamentId = tournamentRes.body._id;

      const teams = await Promise.all(
        [
          { name: 'Egypt', code: 'EGY' },
          { name: 'Brazil', code: 'BRA' },
          { name: 'Spain', code: 'ESP' },
          { name: 'France', code: 'FRA' },
        ].map((team) =>
          request(app.getHttpServer())
            .post('/teams')
            .send(team)
            .expect(201)
            .then((res) => res.body as TeamResponse),
        ),
      );

      const groupRes = await request(app.getHttpServer())
        .post('/groups')
        .send({
          tournamentId,
          name: 'Group A',
          code: 'A',
        })
        .expect(201);

      const groupId = groupRes.body._id;

      for (const [index, team] of teams.entries()) {
        await request(app.getHttpServer())
          .post(`/groups/${groupId}/teams`)
          .send({ teamId: team._id, seed: index + 1 })
          .expect(201);
      }

      await request(app.getHttpServer())
        .post(`/matches/generate/group/${groupId}`)
        .expect(201);

      const matchesRes = await request(app.getHttpServer())
        .get(`/matches/group/${groupId}`)
        .expect(200);

      const matches = matchesRes.body as MatchResponse[];
      expect(matches).toHaveLength(6);

      const resultMap: Record<string, { homeScore: number; awayScore: number }> =
        {
          'EGY-BRA': { homeScore: 2, awayScore: 1 },
          'ESP-FRA': { homeScore: 1, awayScore: 1 },
          'EGY-ESP': { homeScore: 0, awayScore: 3 },
          'BRA-FRA': { homeScore: 2, awayScore: 0 },
          'EGY-FRA': { homeScore: 1, awayScore: 1 },
          'BRA-ESP': { homeScore: 1, awayScore: 2 },
        };

      for (const match of matches) {
        const homeCode = getTeamCode(match.homeTeamId);
        const awayCode = getTeamCode(match.awayTeamId);
        const key = `${homeCode}-${awayCode}`;
        const result = resultMap[key];

        expect(result).toBeDefined();

        await request(app.getHttpServer())
          .post(`/matches/${match._id}/result`)
          .send(result)
          .expect(201);
      }

      const standingsRes = await request(app.getHttpServer())
        .get(`/standings/group/${groupId}`)
        .expect(200);

      const standings = standingsRes.body.standings as StandingRow[];

      expect(standings[0]).toMatchObject({ team: { code: 'ESP' }, points: 7, rank: 1 });
      expect(standings[1]).toMatchObject({ team: { code: 'EGY' }, points: 4, rank: 2 });
      expect(standings[2]).toMatchObject({ team: { code: 'BRA' }, points: 3, rank: 3 });
      expect(standings[3]).toMatchObject({ team: { code: 'FRA' }, points: 2, rank: 4 });
    });
  });

  describe('Full World Cup simulation', () => {
    const submitKnockoutRound = async (
      tournamentId: string,
      round: string,
      fromMatchNumber: number,
      toMatchNumber: number,
    ) => {
      const matchesRes = await request(app.getHttpServer())
        .get(`/matches?tournamentId=${tournamentId}&round=${round}`)
        .expect(200);

      const matches = (matchesRes.body as MatchResponse[]).filter(
        (match) =>
          match.matchNumber >= fromMatchNumber &&
          match.matchNumber <= toMatchNumber,
      );

      expect(matches).toHaveLength(toMatchNumber - fromMatchNumber + 1);

      for (const match of matches) {
        await request(app.getHttpServer())
          .post(`/matches/${match._id}/result`)
          .send({ homeScore: 1, awayScore: 0 })
          .expect(201);
      }
    };

    it('runs from group stage through the final', async () => {
      const tournamentRes = await request(app.getHttpServer())
        .post('/tournaments')
        .send({
          name: 'FIFA World Cup 2026 Simulation',
          year: 2026,
          teamsCount: 48,
          groupsCount: 12,
          teamsPerGroup: 4,
          qualifiedPerGroup: 2,
          bestThirdCount: 8,
        })
        .expect(201);

      const tournamentId = tournamentRes.body._id;

      const teamsByGroup: Record<string, TeamResponse[]> = {};

      for (const groupCode of GROUP_CODES) {
        teamsByGroup[groupCode] = [];

        for (let seed = 1; seed <= 4; seed += 1) {
          const teamRes = await request(app.getHttpServer())
            .post('/teams')
            .send({
              name: `Team ${groupCode}${seed}`,
              code: teamCodeForGroup(groupCode, seed),
            })
            .expect(201);

          teamsByGroup[groupCode].push(teamRes.body as TeamResponse);
        }
      }

      const groupIds: Record<string, string> = {};

      for (const groupCode of GROUP_CODES) {
        const groupRes = await request(app.getHttpServer())
          .post('/groups')
          .send({
            tournamentId,
            name: `Group ${groupCode}`,
            code: groupCode,
          })
          .expect(201);

        groupIds[groupCode] = groupRes.body._id;

        for (const [index, team] of teamsByGroup[groupCode].entries()) {
          await request(app.getHttpServer())
            .post(`/groups/${groupIds[groupCode]}/teams`)
            .send({ teamId: team._id, seed: index + 1 })
            .expect(201);
        }
      }

      await request(app.getHttpServer())
        .post(`/matches/generate/tournament/${tournamentId}/group-stage`)
        .expect(201);

      const groupMatchesRes = await request(app.getHttpServer())
        .get(`/matches?tournamentId=${tournamentId}&round=group`)
        .expect(200);

      const groupMatches = groupMatchesRes.body as MatchResponse[];
      expect(groupMatches).toHaveLength(72);

      for (const match of groupMatches) {
        const homeCode = getTeamCode(match.homeTeamId);
        const awayCode = getTeamCode(match.awayTeamId);
        const result = deterministicGroupResult(homeCode, awayCode);

        await request(app.getHttpServer())
          .post(`/matches/${match._id}/result`)
          .send(result)
          .expect(201);
      }

      await request(app.getHttpServer())
        .get(`/standings/tournament/${tournamentId}`)
        .expect(200);

      const qualifiedRes = await request(app.getHttpServer())
        .get(`/qualifications/tournaments/${tournamentId}/qualified-teams`)
        .expect(200);

      expect(qualifiedRes.body.totalQualified).toBe(32);
      expect(Object.keys(qualifiedRes.body.qualifiedMap)).toHaveLength(32);

      await request(app.getHttpServer())
        .post(`/brackets/tournaments/${tournamentId}/round-of-32`)
        .expect(201);

      const round32Res = await request(app.getHttpServer())
        .get(`/matches?tournamentId=${tournamentId}&round=round_32`)
        .expect(200);

      const round32Matches = round32Res.body as MatchResponse[];
      expect(round32Matches).toHaveLength(16);
      expect(round32Matches.map((match) => match.matchNumber).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 16 }, (_, index) => 73 + index),
      );

      await submitKnockoutRound(tournamentId, 'round_32', 73, 88);

      await request(app.getHttpServer())
        .post(`/knockouts/tournaments/${tournamentId}/generate-next-round`)
        .send({ currentRound: 'round_32' })
        .expect(201);

      await submitKnockoutRound(tournamentId, 'round_16', 89, 96);

      await request(app.getHttpServer())
        .post(`/knockouts/tournaments/${tournamentId}/generate-next-round`)
        .send({ currentRound: 'round_16' })
        .expect(201);

      await submitKnockoutRound(tournamentId, 'quarter_final', 97, 100);

      await request(app.getHttpServer())
        .post(`/knockouts/tournaments/${tournamentId}/generate-next-round`)
        .send({ currentRound: 'quarter_final' })
        .expect(201);

      await submitKnockoutRound(tournamentId, 'semi_final', 101, 102);

      await request(app.getHttpServer())
        .post(`/knockouts/tournaments/${tournamentId}/generate-next-round`)
        .send({ currentRound: 'semi_final' })
        .expect(201);

      await submitKnockoutRound(tournamentId, 'third_place', 103, 103);
      await submitKnockoutRound(tournamentId, 'final', 104, 104);

      const bracketRes = await request(app.getHttpServer())
        .get(`/knockouts/tournaments/${tournamentId}/bracket`)
        .expect(200);

      const finalMatches = bracketRes.body.rounds.final as MatchResponse[];
      expect(finalMatches).toHaveLength(1);
      expect(finalMatches[0].status).toBe('completed');
      expect(finalMatches[0].winnerTeamId).toBeDefined();
    });
  });
});

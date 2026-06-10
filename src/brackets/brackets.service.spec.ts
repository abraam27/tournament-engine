import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { BracketsService } from './brackets.service';
import { StandingsService } from 'src/standings/standings.service';
import { ROUND_OF_32_TEMPLATE } from './round-of-32-template';
import { TournamentGroupStandings } from './interfaces/tournament-group-standings.interface';
import { StandingRow } from 'src/standings/interfaces/standing-row.interface';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { MatchStatus } from 'src/matches/enums/match-status.enum';

describe('BracketsService', () => {
  const tournamentId = '64f1a2b3c4d5e6f7a8b9c0d1';
  let service: BracketsService;
  let standingsService: StandingsService;
  let matchModel: {
    countDocuments: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
  };
  let tournamentModel: { findById: jest.Mock };
  let groupModel: { find: jest.Mock };
  let stageModel: { findOne: jest.Mock; create: jest.Mock };
  let bracketSlotModel: { insertMany: jest.Mock; find: jest.Mock };

  const createStanding = (
    teamId: string,
    name: string,
    code: string,
    rank: number,
    stats: Partial<StandingRow> = {},
  ): StandingRow => ({
    teamId,
    team: { _id: teamId, name, code },
    played: stats.played ?? 3,
    won: stats.won ?? 0,
    drawn: stats.drawn ?? 0,
    lost: stats.lost ?? 0,
    goalsFor: stats.goalsFor ?? 0,
    goalsAgainst: stats.goalsAgainst ?? 0,
    goalDifference: stats.goalDifference ?? 0,
    points: stats.points ?? 0,
    rank,
  });

  const buildTwelveGroupStandings = (): TournamentGroupStandings[] => {
    const groupCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    return groupCodes.map((code, groupIndex) => ({
      groupId: `group-${code.toLowerCase()}`,
      group: {
        _id: `group-${code.toLowerCase()}`,
        name: `Group ${code}`,
        code,
      },
      standings: [
        createStanding(`team-${code}-1`, `${code} First`, `${code}1`, 1, {
          points: 9 - groupIndex,
          goalDifference: 5 - groupIndex,
          goalsFor: 6 - groupIndex,
        }),
        createStanding(`team-${code}-2`, `${code} Second`, `${code}2`, 2, {
          points: 6,
          goalDifference: 2,
          goalsFor: 4,
        }),
        createStanding(`team-${code}-3`, `${code} Third`, `${code}3`, 3, {
          points: 12 - groupIndex,
          goalDifference: 8 - groupIndex,
          goalsFor: 10 - groupIndex,
        }),
        createStanding(`team-${code}-4`, `${code} Fourth`, `${code}4`, 4, {
          points: 0,
          goalDifference: -3,
          goalsFor: 1,
        }),
      ],
    }));
  };

  beforeEach(() => {
    standingsService = new StandingsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    matchModel = {
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    tournamentModel = { findById: jest.fn() };
    groupModel = { find: jest.fn() };
    stageModel = { findOne: jest.fn(), create: jest.fn() };
    bracketSlotModel = { insertMany: jest.fn(), find: jest.fn() };

    service = new BracketsService(
      matchModel as never,
      tournamentModel as never,
      groupModel as never,
      stageModel as never,
      bracketSlotModel as never,
      standingsService,
    );
  });

  it('buildQualifiedTeamsMap returns A1, A2 ... L1, L2 and BEST_THIRD_1 ... BEST_THIRD_8', () => {
    const tournamentStandings = buildTwelveGroupStandings();
    const qualifiedTeams = service.buildQualifiedTeamsMap(tournamentStandings);

    for (const code of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      expect(qualifiedTeams[`${code}1`]).toBe(`team-${code}-1`);
      expect(qualifiedTeams[`${code}2`]).toBe(`team-${code}-2`);
    }

    for (let index = 1; index <= 8; index += 1) {
      expect(qualifiedTeams[`BEST_THIRD_${index}`]).toBeDefined();
    }

    expect(Object.keys(qualifiedTeams)).toHaveLength(32);
  });

  it('sorts best third-place teams by points, goal difference, and goals for', () => {
    const thirdPlaceTeams: StandingRow[] = [
      createStanding('third-a', 'Third A', 'THA', 3, {
        points: 4,
        goalDifference: 0,
        goalsFor: 3,
      }),
      createStanding('third-b', 'Third B', 'THB', 3, {
        points: 6,
        goalDifference: 1,
        goalsFor: 4,
      }),
      createStanding('third-c', 'Third C', 'THC', 3, {
        points: 6,
        goalDifference: 2,
        goalsFor: 3,
      }),
      createStanding('third-d', 'Third D', 'THD', 3, {
        points: 6,
        goalDifference: 2,
        goalsFor: 5,
      }),
    ];

    const bestThird = service.sortThirdPlaceTeams(thirdPlaceTeams);

    expect(bestThird.map((standing) => standing.teamId)).toEqual([
      'third-d',
      'third-c',
      'third-b',
      'third-a',
    ]);
  });

  it('getBestThirdPlacedTeams takes only the best 8 third-place teams', () => {
    const tournamentStandings = buildTwelveGroupStandings();
    const bestThird = service.getBestThirdPlacedTeams(tournamentStandings);

    expect(bestThird).toHaveLength(8);
    expect(
      bestThird.every((standing) => standing.teamId.endsWith('-3')),
    ).toBe(true);
  });

  it('resolveBracketTemplate resolves all 16 matches and 32 slots', () => {
    const qualifiedTeams = service.buildQualifiedTeamsMap(
      buildTwelveGroupStandings(),
    );

    const resolvedMatches = service.resolveBracketTemplate(
      ROUND_OF_32_TEMPLATE,
      qualifiedTeams,
    );

    expect(resolvedMatches).toHaveLength(16);
    expect(
      resolvedMatches.reduce((count, match) => count + match.slots.length, 0),
    ).toBe(32);

    expect(resolvedMatches[0]).toMatchObject({
      homeSourceRef: 'A2',
      awaySourceRef: 'B2',
      homeTeamId: 'team-A-2',
      awayTeamId: 'team-B-2',
    });
  });

  it('resolveBracketTemplate throws BadRequestException when a sourceRef is missing', () => {
    expect(() =>
      service.resolveBracketTemplate(
        [{ home: 'A1', away: 'MISSING_REF' }],
        { A1: 'team-a' },
      ),
    ).toThrow(BadRequestException);
  });

  it('throws ConflictException when round_32 matches already exist', async () => {
    tournamentModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: tournamentId,
        groupsCount: 12,
        teamsPerGroup: 4,
      }),
    });
    groupModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          Array.from({ length: 12 }, (_, index) => ({
            _id: new Types.ObjectId(),
            code: String.fromCharCode(65 + index),
          })),
        ),
      }),
    });
    matchModel.countDocuments.mockImplementation((query: Record<string, unknown>) => ({
      exec: jest.fn().mockResolvedValue(
        query.round === MatchRound.ROUND_32 ? 1 : 6,
      ),
    }));

    jest
      .spyOn(standingsService, 'getTournamentStandings')
      .mockResolvedValue({ tournamentId, groups: buildTwelveGroupStandings() });

    await expect(service.generateRoundOf32(tournamentId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws BadRequestException when group stage is incomplete', async () => {
    tournamentModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: tournamentId,
        groupsCount: 12,
        teamsPerGroup: 4,
      }),
    });
    groupModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          Array.from({ length: 12 }, (_, index) => ({
            _id: new Types.ObjectId(),
            code: String.fromCharCode(65 + index),
          })),
        ),
      }),
    });
    matchModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(4),
    });

    await expect(service.generateRoundOf32(tournamentId)).rejects.toThrow(
      /Group stage is incomplete/,
    );
  });

  it('validateGroupStageCompleted throws when completed matches do not match expected count', async () => {
    const groups = [
      { _id: new Types.ObjectId(), code: 'A' },
      { _id: new Types.ObjectId(), code: 'B' },
    ] as never[];

    matchModel.countDocuments
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(6) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(3) });

    await expect(
      service.validateGroupStageCompleted(tournamentId, 4, groups),
    ).rejects.toThrow(/Group stage is incomplete for groups: B/);
  });
});

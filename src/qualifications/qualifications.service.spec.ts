import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { QualificationsService } from './qualifications.service';
import { StandingsService } from 'src/standings/standings.service';
import { TournamentGroupStandings } from './interfaces/tournament-group-standings.interface';
import { StandingRow } from 'src/standings/interfaces/standing-row.interface';
import { QualificationType } from './enums/qualification-type.enum';

describe('QualificationsService', () => {
  const tournamentId = '64f1a2b3c4d5e6f7a8b9c0d1';
  let service: QualificationsService;
  let standingsService: StandingsService;
  let matchModel: { countDocuments: jest.Mock };
  let tournamentModel: { findById: jest.Mock };
  let groupModel: { find: jest.Mock };

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
          points: 9,
          goalDifference: 5,
          goalsFor: 6,
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

    matchModel = { countDocuments: jest.fn() };
    tournamentModel = { findById: jest.fn() };
    groupModel = { find: jest.fn() };

    service = new QualificationsService(
      matchModel as never,
      tournamentModel as never,
      groupModel as never,
      standingsService,
    );
  });

  it('returns rank 1 and rank 2 from each of 12 groups as automatic qualifiers', () => {
    const tournamentStandings = buildTwelveGroupStandings();
    const automaticQualified =
      service.getAutomaticQualifiedTeams(tournamentStandings);

    expect(automaticQualified).toHaveLength(24);

    for (const code of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      expect(automaticQualified).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sourceRef: `${code}1`,
            qualificationType: QualificationType.GROUP_RANK,
            groupCode: code,
            rank: 1,
            teamId: `team-${code}-1`,
          }),
          expect.objectContaining({
            sourceRef: `${code}2`,
            qualificationType: QualificationType.GROUP_RANK,
            groupCode: code,
            rank: 2,
            teamId: `team-${code}-2`,
          }),
        ]),
      );
    }
  });

  it('sorts third-place teams by points, goal difference, and goals for', () => {
    const candidates = service.collectThirdPlaceCandidates([
      {
        groupId: 'group-a',
        group: { _id: 'group-a', name: 'Group A', code: 'A' },
        standings: [
          createStanding('a1', 'A1', 'A1', 1),
          createStanding('a2', 'A2', 'A2', 2),
          createStanding('a3', 'A3', 'A3', 3, {
            points: 4,
            goalDifference: 0,
            goalsFor: 3,
          }),
          createStanding('a4', 'A4', 'A4', 4),
        ],
      },
      {
        groupId: 'group-b',
        group: { _id: 'group-b', name: 'Group B', code: 'B' },
        standings: [
          createStanding('b1', 'B1', 'B1', 1),
          createStanding('b2', 'B2', 'B2', 2),
          createStanding('b3', 'B3', 'B3', 3, {
            points: 6,
            goalDifference: 2,
            goalsFor: 5,
          }),
          createStanding('b4', 'B4', 'B4', 4),
        ],
      },
      {
        groupId: 'group-c',
        group: { _id: 'group-c', name: 'Group C', code: 'C' },
        standings: [
          createStanding('c1', 'C1', 'C1', 1),
          createStanding('c2', 'C2', 'C2', 2),
          createStanding('c3', 'C3', 'C3', 3, {
            points: 6,
            goalDifference: 2,
            goalsFor: 3,
          }),
          createStanding('c4', 'C4', 'C4', 4),
        ],
      },
    ]);

    const sorted = service.sortThirdPlacedTeams(candidates);

    expect(sorted.map((entry) => entry.standing.teamId)).toEqual([
      'b3',
      'c3',
      'a3',
    ]);
  });

  it('returns only the best 8 third-place teams as qualified', () => {
    const tournamentStandings = buildTwelveGroupStandings();
    const bestThirdQualified =
      service.getBestThirdQualifiedTeams(tournamentStandings);

    expect(bestThirdQualified).toHaveLength(8);
    expect(bestThirdQualified[0].sourceRef).toBe('BEST_THIRD_1');
    expect(bestThirdQualified[7].sourceRef).toBe('BEST_THIRD_8');
    expect(bestThirdQualified[0].thirdPlaceRank).toBe(1);
    expect(bestThirdQualified[7].thirdPlaceRank).toBe(8);
  });

  it('marks only top 8 third-place teams as qualified in third-place ranking', () => {
    const tournamentStandings = buildTwelveGroupStandings();

    jest
      .spyOn(service, 'validateTournamentReadyForQualification')
      .mockResolvedValue({
        tournament: { groupsCount: 12, teamsPerGroup: 4 } as never,
        groups: [] as never[],
        tournamentStandings,
      });

    return service.getThirdPlaceRanking(tournamentId).then((result) => {
      expect(result.ranking).toHaveLength(12);
      expect(result.ranking.filter((entry) => entry.qualified)).toHaveLength(8);
      expect(result.ranking.filter((entry) => !entry.qualified)).toHaveLength(4);
      expect(result.ranking[0].qualified).toBe(true);
      expect(result.ranking[7].qualified).toBe(true);
      expect(result.ranking[8].qualified).toBe(false);
    });
  });

  it('returns totalQualified = 32', async () => {
    const tournamentStandings = buildTwelveGroupStandings();

    jest
      .spyOn(service, 'validateTournamentReadyForQualification')
      .mockResolvedValue({
        tournament: { groupsCount: 12, teamsPerGroup: 4 } as never,
        groups: [] as never[],
        tournamentStandings,
      });

    const result = await service.getQualifiedTeams(tournamentId);

    expect(result.totalQualified).toBe(32);
    expect(result.automaticQualified).toHaveLength(24);
    expect(result.bestThirdQualified).toHaveLength(8);
  });

  it('buildQualifiedMap includes A1, A2, L1, L2, BEST_THIRD_1, and BEST_THIRD_8', () => {
    const tournamentStandings = buildTwelveGroupStandings();
    const automaticQualified =
      service.getAutomaticQualifiedTeams(tournamentStandings);
    const bestThirdQualified =
      service.getBestThirdQualifiedTeams(tournamentStandings);
    const qualifiedMap = service.buildQualifiedMap(
      automaticQualified,
      bestThirdQualified,
    );

    expect(qualifiedMap.A1).toBe('team-A-1');
    expect(qualifiedMap.A2).toBe('team-A-2');
    expect(qualifiedMap.L1).toBe('team-L-1');
    expect(qualifiedMap.L2).toBe('team-L-2');
    expect(qualifiedMap.BEST_THIRD_1).toBeDefined();
    expect(qualifiedMap.BEST_THIRD_8).toBeDefined();
    expect(Object.keys(qualifiedMap)).toHaveLength(32);
  });

  it('throws BadRequestException when tournament has fewer groups than expected', async () => {
    tournamentModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: tournamentId,
        groupsCount: 12,
        teamsPerGroup: 4,
      }),
    });
    groupModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), code: 'A' },
        ]),
      }),
    });

    await expect(
      service.validateTournamentReadyForQualification(tournamentId),
    ).rejects.toThrow(BadRequestException);
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

    await expect(
      service.validateTournamentReadyForQualification(tournamentId),
    ).rejects.toThrow(/Group stage is incomplete/);
  });

  it('throws BadRequestException when fewer than 8 third-place teams exist', async () => {
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
      exec: jest.fn().mockResolvedValue(6),
    });

    const standingsWithFewThirds = buildTwelveGroupStandings().map(
      (groupStanding, index) => ({
        ...groupStanding,
        standings:
          index < 6
            ? groupStanding.standings
            : groupStanding.standings.filter((standing) => standing.rank !== 3),
      }),
    );

    jest
      .spyOn(standingsService, 'getTournamentStandings')
      .mockResolvedValue({
        tournamentId,
        groups: standingsWithFewThirds,
      });

    await expect(
      service.validateTournamentReadyForQualification(tournamentId),
    ).rejects.toThrow(/At least 8 third-place teams are required/);
  });
});

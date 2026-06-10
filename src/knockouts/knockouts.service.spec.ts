import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { KnockoutsService } from './knockouts.service';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { MatchStatus } from 'src/matches/enums/match-status.enum';
import { Match } from 'src/matches/schemas/match.schema';
import { BracketSourceType } from 'src/bracket-slots/enums/bracket-source-type.enum';
import { ROUND_OF_16_TEMPLATE } from './templates/round-of-16.template';
import { QUARTER_FINAL_TEMPLATE } from './templates/quarter-final.template';
import { SEMI_FINAL_TEMPLATE } from './templates/semi-final.template';
import { THIRD_PLACE_TEMPLATE } from './templates/third-place.template';
import { FINAL_TEMPLATE } from './templates/final.template';

describe('KnockoutsService', () => {
  const tournamentId = '64f1a2b3c4d5e6f7a8b9c0d1';
  const homeTeamId = new Types.ObjectId('64f1a2b3c4d5e6f7a8b9c0d3');
  const awayTeamId = new Types.ObjectId('64f1a2b3c4d5e6f7a8b9c0d4');
  const winnerTeamId = new Types.ObjectId('64f1a2b3c4d5e6f7a8b9c0d5');
  const loserTeamId = new Types.ObjectId('64f1a2b3c4d5e6f7a8b9c0d6');

  let service: KnockoutsService;
  let matchModel: {
    countDocuments: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
  };
  let tournamentModel: { findById: jest.Mock };
  let stageModel: { findOne: jest.Mock; create: jest.Mock };
  let bracketSlotModel: { insertMany: jest.Mock };

  const createKnockoutMatch = (
    matchNumber: number,
    overrides: Partial<Match> = {},
  ): Match =>
    ({
      _id: new Types.ObjectId(),
      tournamentId: new Types.ObjectId(tournamentId),
      round: MatchRound.ROUND_32,
      matchNumber,
      homeTeamId,
      awayTeamId,
      status: MatchStatus.SCHEDULED,
      ...overrides,
    }) as Match;

  const createCompletedMatch = (
    matchNumber: number,
    winner: Types.ObjectId,
    loser: Types.ObjectId,
    round: MatchRound = MatchRound.ROUND_32,
  ) =>
    createKnockoutMatch(matchNumber, {
      round,
      status: MatchStatus.COMPLETED,
      winnerTeamId: winner,
      loserTeamId: loser,
      homeScore: 1,
      awayScore: 0,
    });

  const buildMatchByNumber = (matchNumbers: number[]) =>
    new Map(
      matchNumbers.map((matchNumber) => [
        matchNumber,
        createCompletedMatch(matchNumber, winnerTeamId, loserTeamId),
      ]),
    );

  beforeEach(() => {
    matchModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    tournamentModel = { findById: jest.fn() };
    stageModel = { findOne: jest.fn(), create: jest.fn() };
    bracketSlotModel = { insertMany: jest.fn() };

    service = new KnockoutsService(
      matchModel as never,
      tournamentModel as never,
      stageModel as never,
      bracketSlotModel as never,
    );
  });

  const baseKnockoutMatch = {
    homeTeamId,
    awayTeamId,
  } as Match;

  describe('winner determination', () => {
    it('determines full-time home win', () => {
      const result = service.determineKnockoutWinner(baseKnockoutMatch, {
        homeScore: 2,
        awayScore: 1,
      });

      expect(result.winnerTeamId).toEqual(homeTeamId);
      expect(result.loserTeamId).toEqual(awayTeamId);
      expect(result.hasExtraTime).toBe(false);
      expect(result.hasPenalties).toBe(false);
    });

    it('determines full-time away win', () => {
      const result = service.determineKnockoutWinner(baseKnockoutMatch, {
        homeScore: 0,
        awayScore: 3,
      });

      expect(result.winnerTeamId).toEqual(awayTeamId);
      expect(result.loserTeamId).toEqual(homeTeamId);
    });

    it('determines extra-time home win', () => {
      const result = service.determineKnockoutWinner(baseKnockoutMatch, {
        homeScore: 1,
        awayScore: 1,
        hasExtraTime: true,
        extraTimeHomeScore: 2,
        extraTimeAwayScore: 1,
      });

      expect(result.winnerTeamId).toEqual(homeTeamId);
      expect(result.hasExtraTime).toBe(true);
      expect(result.hasPenalties).toBe(false);
    });

    it('determines extra-time away win', () => {
      const result = service.determineKnockoutWinner(baseKnockoutMatch, {
        homeScore: 1,
        awayScore: 1,
        hasExtraTime: true,
        extraTimeHomeScore: 1,
        extraTimeAwayScore: 2,
      });

      expect(result.winnerTeamId).toEqual(awayTeamId);
      expect(result.hasExtraTime).toBe(true);
    });

    it('determines penalty home win', () => {
      const result = service.determineKnockoutWinner(baseKnockoutMatch, {
        homeScore: 1,
        awayScore: 1,
        hasExtraTime: true,
        extraTimeHomeScore: 1,
        extraTimeAwayScore: 1,
        hasPenalties: true,
        penaltiesHomeScore: 5,
        penaltiesAwayScore: 4,
      });

      expect(result.winnerTeamId).toEqual(homeTeamId);
      expect(result.hasPenalties).toBe(true);
    });

    it('determines penalty away win', () => {
      const result = service.determineKnockoutWinner(baseKnockoutMatch, {
        homeScore: 1,
        awayScore: 1,
        hasExtraTime: true,
        extraTimeHomeScore: 1,
        extraTimeAwayScore: 1,
        hasPenalties: true,
        penaltiesHomeScore: 3,
        penaltiesAwayScore: 4,
      });

      expect(result.winnerTeamId).toEqual(awayTeamId);
      expect(result.hasPenalties).toBe(true);
    });

    it('throws when knockout match is drawn after full time without extra time', () => {
      expect(() =>
        service.determineKnockoutWinner(baseKnockoutMatch, {
          homeScore: 1,
          awayScore: 1,
        }),
      ).toThrow(BadRequestException);
    });

    it('throws when knockout match is drawn after extra time without penalties', () => {
      expect(() =>
        service.determineKnockoutWinner(baseKnockoutMatch, {
          homeScore: 1,
          awayScore: 1,
          hasExtraTime: true,
          extraTimeHomeScore: 1,
          extraTimeAwayScore: 1,
        }),
      ).toThrow(BadRequestException);
    });

    it('throws when penalty shootout scores are equal', () => {
      expect(() =>
        service.determineKnockoutWinner(baseKnockoutMatch, {
          homeScore: 1,
          awayScore: 1,
          hasExtraTime: true,
          extraTimeHomeScore: 1,
          extraTimeAwayScore: 1,
          hasPenalties: true,
          penaltiesHomeScore: 4,
          penaltiesAwayScore: 4,
        }),
      ).toThrow(BadRequestException);
    });

    it('throws when group match uses extra time', () => {
      const groupMatch = {
        ...baseKnockoutMatch,
        round: MatchRound.GROUP,
      } as Match;

      expect(() =>
        service.determineGroupWinner(groupMatch, {
          homeScore: 1,
          awayScore: 0,
          hasExtraTime: true,
          extraTimeHomeScore: 2,
          extraTimeAwayScore: 1,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('resolveSourceRef', () => {
    it('resolves WINNER_MATCH source refs', () => {
      const resolved = service.resolveSourceRef(
        'WINNER_MATCH_74',
        buildMatchByNumber([74]),
      );

      expect(resolved).toEqual({
        teamId: winnerTeamId.toString(),
        sourceType: BracketSourceType.MATCH_WINNER,
        sourceRef: 'WINNER_MATCH_74',
      });
    });

    it('resolves LOSER_MATCH source refs', () => {
      const resolved = service.resolveSourceRef(
        'LOSER_MATCH_101',
        buildMatchByNumber([101]),
      );

      expect(resolved).toEqual({
        teamId: loserTeamId.toString(),
        sourceType: BracketSourceType.MATCH_LOSER,
        sourceRef: 'LOSER_MATCH_101',
      });
    });

    it('throws when source match is missing', () => {
      expect(() =>
        service.resolveSourceRef('WINNER_MATCH_74', new Map()),
      ).toThrow(/does not exist/);
    });

    it('throws when source match is not completed', () => {
      const matchByNumber = new Map<number, Match>([
        [
          74,
          createKnockoutMatch(74, { status: MatchStatus.SCHEDULED }),
        ],
      ]);

      expect(() =>
        service.resolveSourceRef('WINNER_MATCH_74', matchByNumber),
      ).toThrow(/is not completed/);
    });

    it('throws when winner is missing', () => {
      const matchByNumber = new Map<number, Match>([
        [
          74,
          createKnockoutMatch(74, {
            status: MatchStatus.COMPLETED,
            winnerTeamId: undefined,
          }),
        ],
      ]);

      expect(() =>
        service.resolveSourceRef('WINNER_MATCH_74', matchByNumber),
      ).toThrow(/Winner is not determined/);
    });

    it('throws when loser is missing', () => {
      const matchByNumber = new Map<number, Match>([
        [
          101,
          createKnockoutMatch(101, {
            status: MatchStatus.COMPLETED,
            winnerTeamId,
            loserTeamId: undefined,
          }),
        ],
      ]);

      expect(() =>
        service.resolveSourceRef('LOSER_MATCH_101', matchByNumber),
      ).toThrow(/Loser is not determined/);
    });
  });

  describe('resolveRoundTemplate', () => {
    it('resolves Round of 16 match numbers 89-96 from exact source refs', () => {
      const matchByNumber = buildMatchByNumber(
        Array.from({ length: 16 }, (_, index) => 73 + index),
      );

      const resolved = service.resolveRoundTemplate(
        { round: MatchRound.ROUND_16, matches: ROUND_OF_16_TEMPLATE },
        matchByNumber,
      );

      expect(resolved.map((match) => match.matchNumber)).toEqual([
        89, 90, 91, 92, 93, 94, 95, 96,
      ]);
      expect(resolved[0]).toMatchObject({
        homeSourceRef: 'WINNER_MATCH_74',
        awaySourceRef: 'WINNER_MATCH_77',
        matchDate: new Date('2026-07-04'),
        stadium: 'Philadelphia Stadium',
      });
    });

    it('resolves Quarter Final match numbers 97-100', () => {
      const matchByNumber = buildMatchByNumber(
        Array.from({ length: 8 }, (_, index) => 89 + index),
      );

      const resolved = service.resolveRoundTemplate(
        { round: MatchRound.QUARTER_FINAL, matches: QUARTER_FINAL_TEMPLATE },
        matchByNumber,
      );

      expect(resolved.map((match) => match.matchNumber)).toEqual([
        97, 98, 99, 100,
      ]);
      expect(resolved[1]).toMatchObject({
        homeSourceRef: 'WINNER_MATCH_93',
        awaySourceRef: 'WINNER_MATCH_94',
        stadium: 'Los Angeles Stadium',
      });
    });

    it('resolves Semi Final match numbers 101-102', () => {
      const matchByNumber = buildMatchByNumber([97, 98, 99, 100]);

      const resolved = service.resolveRoundTemplate(
        { round: MatchRound.SEMI_FINAL, matches: SEMI_FINAL_TEMPLATE },
        matchByNumber,
      );

      expect(resolved.map((match) => match.matchNumber)).toEqual([101, 102]);
    });

    it('resolves Third Place match 103 from semi-final losers', () => {
      const matchByNumber = new Map<number, Match>([
        [101, createCompletedMatch(101, winnerTeamId, loserTeamId, MatchRound.SEMI_FINAL)],
        [102, createCompletedMatch(102, winnerTeamId, loserTeamId, MatchRound.SEMI_FINAL)],
      ]);

      const resolved = service.resolveRoundTemplate(
        { round: MatchRound.THIRD_PLACE, matches: THIRD_PLACE_TEMPLATE },
        matchByNumber,
      );

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toMatchObject({
        matchNumber: 103,
        homeSourceRef: 'LOSER_MATCH_101',
        awaySourceRef: 'LOSER_MATCH_102',
        homeSourceType: BracketSourceType.MATCH_LOSER,
        awaySourceType: BracketSourceType.MATCH_LOSER,
        stadium: 'Miami Stadium',
      });
    });

    it('resolves Final match 104 from semi-final winners', () => {
      const matchByNumber = new Map<number, Match>([
        [101, createCompletedMatch(101, winnerTeamId, loserTeamId, MatchRound.SEMI_FINAL)],
        [102, createCompletedMatch(102, winnerTeamId, loserTeamId, MatchRound.SEMI_FINAL)],
      ]);

      const resolved = service.resolveRoundTemplate(
        { round: MatchRound.FINAL, matches: FINAL_TEMPLATE },
        matchByNumber,
      );

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toMatchObject({
        matchNumber: 104,
        homeSourceRef: 'WINNER_MATCH_101',
        awaySourceRef: 'WINNER_MATCH_102',
        stadium: 'New York New Jersey Stadium',
      });
    });
  });

  describe('generateRoundFromTemplate', () => {
    const setupGenerationMocks = () => {
      matchModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      matchModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          Array.from({ length: 16 }, (_, index) =>
            createCompletedMatch(73 + index, winnerTeamId, loserTeamId),
          ),
        ),
      });
      stageModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      stageModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
      bracketSlotModel.insertMany.mockResolvedValue([]);

      matchModel.create.mockImplementation(async (payload: Record<string, unknown>) => {
        const match = {
          _id: new Types.ObjectId(),
          ...payload,
        };
        matchModel.findById.mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(match),
            }),
          }),
        });
        return match;
      });
    };

    it('creates matches with template matchDate and stadium', async () => {
      setupGenerationMocks();

      await service.generateRoundFromTemplate(
        tournamentId,
        MatchRound.ROUND_16,
        ROUND_OF_16_TEMPLATE,
      );

      expect(matchModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          matchNumber: 89,
          round: MatchRound.ROUND_16,
          matchDate: new Date('2026-07-04'),
          stadium: 'Philadelphia Stadium',
        }),
      );
      expect(matchModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          matchNumber: 96,
          stadium: 'BC Place Vancouver',
        }),
      );
    });

    it('throws ConflictException when target round already exists', async () => {
      matchModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await expect(
        service.generateRoundFromTemplate(
          tournamentId,
          MatchRound.ROUND_16,
          ROUND_OF_16_TEMPLATE,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('generateNextRound', () => {
    const setupTournament = () => {
      tournamentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: tournamentId }),
      });
    };

    it('creates Round of 16 matches 89-96 from the template', async () => {
      setupTournament();
      const round32Matches = Array.from({ length: 16 }, (_, index) =>
        createCompletedMatch(73 + index, winnerTeamId, loserTeamId),
      );

      matchModel.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(round32Matches),
        }),
        exec: jest.fn().mockResolvedValue(round32Matches),
      }));
      matchModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      stageModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      stageModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
      bracketSlotModel.insertMany.mockResolvedValue([]);

      const createdMatchNumbers: number[] = [];
      matchModel.create.mockImplementation(async (payload: { matchNumber: number }) => {
        createdMatchNumbers.push(payload.matchNumber);
        const match = { _id: new Types.ObjectId(), ...payload };
        matchModel.findById.mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(match),
            }),
          }),
        });
        return match;
      });

      const result = await service.generateNextRound(
        tournamentId,
        MatchRound.ROUND_32,
      );

      expect(result.createdMatchesCount).toBe(8);
      expect(result.nextRounds).toEqual([MatchRound.ROUND_16]);
      expect(createdMatchNumbers).toEqual([89, 90, 91, 92, 93, 94, 95, 96]);
    });

    it('throws BadRequestException when current round is incomplete', async () => {
      setupTournament();
      const incompleteMatches = Array.from({ length: 16 }, (_, index) =>
        createKnockoutMatch(73 + index, {
          status:
            index === 0 ? MatchStatus.SCHEDULED : MatchStatus.COMPLETED,
          winnerTeamId,
          loserTeamId,
        }),
      );

      matchModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(incompleteMatches),
        }),
      });

      await expect(
        service.generateNextRound(tournamentId, MatchRound.ROUND_32),
      ).rejects.toThrow(/must be completed/);
    });
  });
});

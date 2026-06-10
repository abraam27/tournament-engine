import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { MatchesService } from './matches.service';
import { FixtureGeneratorService } from './fixture-generator.service';
import { KnockoutsService } from 'src/knockouts/knockouts.service';
import { MatchRound } from './enums/match-round.enum';
import { MatchStatus } from './enums/match-status.enum';
import { SubmitMatchResultDto } from './dto/submit-match-result.dto';

describe('MatchesService', () => {
  const groupId = '64f1a2b3c4d5e6f7a8b9c0d1';
  const tournamentId = '64f1a2b3c4d5e6f7a8b9c0d2';
  const team1Id = '64f1a2b3c4d5e6f7a8b9c0d3';
  const team2Id = '64f1a2b3c4d5e6f7a8b9c0d4';
  const team3Id = '64f1a2b3c4d5e6f7a8b9c0d5';
  const team4Id = '64f1a2b3c4d5e6f7a8b9c0d6';
  const matchId = '64f1a2b3c4d5e6f7a8b9c0d7';

  let service: MatchesService;
  let matchModel: {
    countDocuments: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOne: jest.Mock;
  };
  let tournamentModel: { findById: jest.Mock };
  let groupModel: { findById: jest.Mock; find: jest.Mock };
  let groupTeamModel: { find: jest.Mock };
  let teamModel: { findById: jest.Mock };
  let knockoutsService: KnockoutsService;

  beforeEach(() => {
    matchModel = {
      countDocuments: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
    };
    tournamentModel = { findById: jest.fn() };
    groupModel = { findById: jest.fn(), find: jest.fn() };
    groupTeamModel = { find: jest.fn() };
    teamModel = { findById: jest.fn() };
    knockoutsService = new KnockoutsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    service = new MatchesService(
      matchModel as never,
      tournamentModel as never,
      groupModel as never,
      groupTeamModel as never,
      teamModel as never,
      new FixtureGeneratorService(),
      knockoutsService,
    );
  });

  it('throws ConflictException when generating fixtures for a group that already has matches', async () => {
    groupModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: groupId,
        tournamentId,
        code: 'A',
      }),
    });
    tournamentModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: tournamentId, teamsPerGroup: 4 }),
    });
    groupTeamModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { teamId: team1Id, seed: 1 },
          { teamId: team2Id, seed: 2 },
          { teamId: team3Id, seed: 3 },
          { teamId: team4Id, seed: 4 },
        ]),
      }),
    });
    matchModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(6),
    });

    await expect(service.generateGroupFixtures(groupId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws BadRequestException when group does not have enough teams', async () => {
    groupModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: groupId,
        tournamentId,
        code: 'A',
      }),
    });
    tournamentModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: tournamentId, teamsPerGroup: 4 }),
    });
    groupTeamModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { teamId: team1Id, seed: 1 },
          { teamId: team2Id, seed: 2 },
        ]),
      }),
    });

    await expect(service.generateGroupFixtures(groupId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when scheduling a non-existent match', async () => {
    matchModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.schedule(matchId, {
        matchDate: '2026-06-11T21:00:00+03:00',
        stadium: 'Estadio Azteca',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when scheduling a completed match', async () => {
    matchModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: matchId,
        status: MatchStatus.COMPLETED,
      }),
    });

    await expect(
      service.schedule(matchId, {
        matchDate: '2026-06-11T21:00:00+03:00',
        stadium: 'Estadio Azteca',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when scheduling a cancelled match', async () => {
    matchModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: matchId,
        status: MatchStatus.CANCELLED,
      }),
    });

    await expect(
      service.schedule(matchId, {
        matchDate: '2026-06-11T21:00:00+03:00',
        stadium: 'Estadio Azteca',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('schedules a match with matchDate and stadium', async () => {
    const scheduledMatch = {
      _id: matchId,
      status: MatchStatus.SCHEDULED,
      matchDate: new Date('2026-06-11T21:00:00+03:00'),
      stadium: 'Estadio Azteca',
    };

    matchModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          _id: matchId,
          status: MatchStatus.SCHEDULED,
        }),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(scheduledMatch),
          }),
        }),
      });
    matchModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(scheduledMatch),
    });

    const result = await service.schedule(matchId, {
      matchDate: '2026-06-11T21:00:00+03:00',
      stadium: 'Estadio Azteca',
    });

    expect(matchModel.findByIdAndUpdate).toHaveBeenCalledWith(
      matchId,
      {
        matchDate: new Date('2026-06-11T21:00:00+03:00'),
        stadium: 'Estadio Azteca',
      },
      { returnDocument: 'after', runValidators: true },
    );
    expect(result).toEqual(scheduledMatch);
  });

  const mockFindOneResult = (result: unknown) => ({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    }),
  });

  const baseGroupMatch = {
    _id: matchId,
    round: MatchRound.GROUP,
    status: MatchStatus.SCHEDULED,
    homeTeamId: new Types.ObjectId(team1Id),
    awayTeamId: new Types.ObjectId(team2Id),
  };

  it('submits a home win result', async () => {
    const completedMatch = {
      ...baseGroupMatch,
      status: MatchStatus.COMPLETED,
      homeScore: 2,
      awayScore: 1,
      winnerTeamId: new Types.ObjectId(team1Id),
      loserTeamId: new Types.ObjectId(team2Id),
    };

    matchModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(baseGroupMatch),
      })
      .mockReturnValueOnce(mockFindOneResult(completedMatch));
    matchModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(completedMatch),
    });

    const result = await service.submitResult(matchId, {
      homeScore: 2,
      awayScore: 1,
    });

    expect(matchModel.findByIdAndUpdate).toHaveBeenCalledWith(
      matchId,
      {
        homeScore: 2,
        awayScore: 1,
        status: MatchStatus.COMPLETED,
        winnerTeamId: new Types.ObjectId(team1Id),
        loserTeamId: new Types.ObjectId(team2Id),
      },
      { returnDocument: 'after', runValidators: true },
    );
    expect(result).toEqual(completedMatch);
  });

  it('submits an away win result', async () => {
    matchModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(baseGroupMatch),
      })
      .mockReturnValueOnce(mockFindOneResult(baseGroupMatch));
    matchModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(baseGroupMatch),
    });

    await service.submitResult(matchId, { homeScore: 0, awayScore: 3 });

    expect(matchModel.findByIdAndUpdate).toHaveBeenCalledWith(
      matchId,
      expect.objectContaining({
        homeScore: 0,
        awayScore: 3,
        status: MatchStatus.COMPLETED,
        winnerTeamId: new Types.ObjectId(team2Id),
        loserTeamId: new Types.ObjectId(team1Id),
      }),
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('submits a draw result with no winner or loser', async () => {
    matchModel.findById
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(baseGroupMatch),
      })
      .mockReturnValueOnce(mockFindOneResult(baseGroupMatch));
    matchModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(baseGroupMatch),
    });

    await service.submitResult(matchId, { homeScore: 1, awayScore: 1 });

    expect(matchModel.findByIdAndUpdate).toHaveBeenCalledWith(
      matchId,
      expect.objectContaining({
        homeScore: 1,
        awayScore: 1,
        status: MatchStatus.COMPLETED,
        winnerTeamId: null,
        loserTeamId: null,
      }),
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('rejects negative scores in SubmitMatchResultDto validation', async () => {
    const dto = plainToInstance(SubmitMatchResultDto, {
      homeScore: -1,
      awayScore: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('throws ConflictException when submitting result for a completed match', async () => {
    matchModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...baseGroupMatch,
        status: MatchStatus.COMPLETED,
      }),
    });

    await expect(
      service.submitResult(matchId, { homeScore: 1, awayScore: 0 }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when submitting result for a cancelled match', async () => {
    matchModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...baseGroupMatch,
        status: MatchStatus.CANCELLED,
      }),
    });

    await expect(
      service.submitResult(matchId, { homeScore: 1, awayScore: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when updating a completed match', async () => {
    matchModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...baseGroupMatch,
        status: MatchStatus.COMPLETED,
      }),
    });

    await expect(
      service.update(matchId, { stadium: 'New Stadium' }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when homeTeamId and awayTeamId are the same', async () => {
    await expect(
      service.create({
        tournamentId: '64f1a2b3c4d5e6f7a8b9c0d1',
        round: MatchRound.GROUP,
        groupId: '64f1a2b3c4d5e6f7a8b9c0d2',
        matchNumber: 1,
        homeTeamId: '64f1a2b3c4d5e6f7a8b9c0d3',
        awayTeamId: '64f1a2b3c4d5e6f7a8b9c0d3',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

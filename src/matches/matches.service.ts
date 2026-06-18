import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from './schemas/match.schema';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { Group } from 'src/groups/schemas/group.schema';
import { GroupTeam } from 'src/groups/schemas/group-team.schema';
import { Team } from 'src/teams/schemas/team.schema';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { ScheduleMatchDto } from './dto/schedule-match.dto';
import { SubmitMatchResultDto } from './dto/submit-match-result.dto';
import { MatchRound } from './enums/match-round.enum';
import { MatchStatus } from './enums/match-status.enum';
import { FixtureGeneratorService } from './fixture-generator.service';
import {
  assertValidObjectId,
  handleDuplicateKeyError,
} from 'src/common/utils/mongoose.util';
import { KnockoutsService } from 'src/knockouts/knockouts.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupTeam.name)
    private readonly groupTeamModel: Model<GroupTeam>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    private readonly fixtureGeneratorService: FixtureGeneratorService,
    private readonly knockoutsService: KnockoutsService,
  ) {}

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    this.assertTeamsAreDifferent(
      createMatchDto.homeTeamId,
      createMatchDto.awayTeamId,
    );

    if (createMatchDto.round === MatchRound.GROUP && !createMatchDto.groupId) {
      throw new BadRequestException('groupId is required when round is group');
    }

    await this.validateTournamentExists(createMatchDto.tournamentId);
    await this.validateTeamExists(createMatchDto.homeTeamId, 'homeTeamId');
    await this.validateTeamExists(createMatchDto.awayTeamId, 'awayTeamId');

    if (createMatchDto.groupId) {
      await this.validateGroupBelongsToTournament(
        createMatchDto.groupId,
        createMatchDto.tournamentId,
      );
      await this.assertNoDuplicateGroupFixture(
        createMatchDto.groupId,
        createMatchDto.homeTeamId,
        createMatchDto.awayTeamId,
      );
    }

    try {
      const match = new this.matchModel({
        ...createMatchDto,
        matchDate: createMatchDto.matchDate
          ? new Date(createMatchDto.matchDate)
          : undefined,
      });
      const saved = await match.save();
      return this.findOne(saved._id.toString());
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async findAll(filters: {
    tournamentId?: string;
    groupId?: string;
    round?: MatchRound;
    status?: MatchStatus;
  }): Promise<Match[]> {
    const query: Record<string, unknown> = {};

    if (filters.tournamentId) {
      assertValidObjectId(filters.tournamentId, 'tournamentId');
      query.tournamentId = filters.tournamentId;
    }
    if (filters.groupId) {
      assertValidObjectId(filters.groupId, 'groupId');
      query.groupId = filters.groupId;
    }
    if (filters.round) {
      query.round = filters.round;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    return this.matchModel
      .find(query)
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .exec();
  }

  async findByGroup(groupId: string): Promise<Match[]> {
    assertValidObjectId(groupId, 'groupId');
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }

    return this.matchModel
      .find({ groupId })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel
      .findById(id)
      .populate('homeTeamId')
      .populate('awayTeamId')
      .exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }
    return match;
  }

  async submitResult(
    id: string,
    submitMatchResultDto: SubmitMatchResultDto,
  ): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }

    if (match.status === MatchStatus.COMPLETED) {
      throw new ConflictException('Match result has already been submitted');
    }

    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot submit result for a cancelled match',
      );
    }

    const { homeScore, awayScore } = submitMatchResultDto;
    const updatePayload: Record<string, unknown> = {
      homeScore,
      awayScore,
      status: MatchStatus.COMPLETED,
    };

    if (match.round === MatchRound.GROUP) {
      const { winnerTeamId, loserTeamId } =
        this.knockoutsService.determineGroupWinner(
          match,
          submitMatchResultDto,
        );
      updatePayload.winnerTeamId = winnerTeamId ?? null;
      updatePayload.loserTeamId = loserTeamId ?? null;
    } else {
      const knockoutResult = this.knockoutsService.determineKnockoutWinner(
        match,
        submitMatchResultDto,
      );
      updatePayload.winnerTeamId = knockoutResult.winnerTeamId;
      updatePayload.loserTeamId = knockoutResult.loserTeamId;
      updatePayload.hasExtraTime = knockoutResult.hasExtraTime;
      updatePayload.extraTimeHomeScore = knockoutResult.extraTimeHomeScore;
      updatePayload.extraTimeAwayScore = knockoutResult.extraTimeAwayScore;
      updatePayload.hasPenalties = knockoutResult.hasPenalties;
      updatePayload.penaltiesHomeScore = knockoutResult.penaltiesHomeScore;
      updatePayload.penaltiesAwayScore = knockoutResult.penaltiesAwayScore;
    }

    await this.matchModel
      .findByIdAndUpdate(id, updatePayload, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();

    return this.findOne(id);
  }

  async update(id: string, updateMatchDto: UpdateMatchDto): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }

    this.ensureMatchCanBeUpdated(match);

    const updatePayload: Record<string, unknown> = { ...updateMatchDto };
    if (updateMatchDto.matchDate) {
      updatePayload.matchDate = new Date(updateMatchDto.matchDate);
    }

    if (updateMatchDto.homeTeamId || updateMatchDto.awayTeamId) {
      const newHomeTeamId =
        updateMatchDto.homeTeamId ?? match.homeTeamId.toString();
      const newAwayTeamId =
        updateMatchDto.awayTeamId ?? match.awayTeamId.toString();

      await this.validateTeamExists(newHomeTeamId, 'homeTeamId');
      await this.validateTeamExists(newAwayTeamId, 'awayTeamId');
      this.assertTeamsAreDifferent(newHomeTeamId, newAwayTeamId);

      updatePayload.homeTeamId = new Types.ObjectId(newHomeTeamId);
      updatePayload.awayTeamId = new Types.ObjectId(newAwayTeamId);

      const isSwap =
        newHomeTeamId === match.awayTeamId.toString() &&
        newAwayTeamId === match.homeTeamId.toString();

      if (isSwap) {
        this.applyTeamSwapSideEffects(match, updatePayload);
      }
    }

    try {
      await this.matchModel
        .findByIdAndUpdate(id, updatePayload, {
          returnDocument: 'after',
          runValidators: true,
        })
        .exec();
      return this.findOne(id);
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async swapTeams(id: string): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }

    this.ensureMatchCanBeUpdated(match);

    const updatePayload: Record<string, unknown> = {
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
    };

    this.applyTeamSwapSideEffects(match, updatePayload);

    await this.matchModel
      .findByIdAndUpdate(id, updatePayload, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();

    return this.findOne(id);
  }

  async schedule(id: string, scheduleMatchDto: ScheduleMatchDto): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }

    if (
      match.status === MatchStatus.COMPLETED ||
      match.status === MatchStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot schedule completed or cancelled matches',
      );
    }

    await this.matchModel
      .findByIdAndUpdate(
        id,
        {
          matchDate: new Date(scheduleMatchDto.matchDate),
          stadium: scheduleMatchDto.stadium,
        },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    updateMatchStatusDto: UpdateMatchStatusDto,
  ): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel.findById(id).exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }

    if (match.status === MatchStatus.COMPLETED) {
      throw new ConflictException('Completed matches cannot be modified');
    }

    const newStatus = updateMatchStatusDto.status;

    if (newStatus === MatchStatus.COMPLETED) {
      if (match.homeScore === undefined || match.awayScore === undefined) {
        throw new BadRequestException(
          'homeScore and awayScore must exist before marking match as completed',
        );
      }
    }

    if (newStatus === MatchStatus.LIVE && match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Can only set status to live from scheduled',
      );
    }

    await this.matchModel
      .findByIdAndUpdate(
        id,
        { status: updateMatchStatusDto.status },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();

    return this.findOne(id);
  }

  async remove(id: string): Promise<Match> {
    assertValidObjectId(id, 'id');
    const match = await this.matchModel.findByIdAndDelete(id).exec();
    if (!match) {
      throw new NotFoundException(`Match with id "${id}" not found`);
    }
    return match;
  }

  async generateGroupFixtures(groupId: string) {
    const { group, tournament, teamIds } =
      await this.validateGroupReadyForFixtures(groupId);

    const existingMatches = await this.matchModel
      .countDocuments({ groupId, round: MatchRound.GROUP })
      .exec();
    if (existingMatches > 0) {
      throw new ConflictException(
        `Group-stage fixtures already exist for group "${groupId}"`,
      );
    }

    const fixtures =
      this.fixtureGeneratorService.generateRoundRobinFixtures(teamIds);
    let nextMatchNumber = await this.getNextMatchNumber(
      tournament._id.toString(),
    );

    const createdMatches: Match[] = [];
    for (const fixture of fixtures) {
      const match = await this.matchModel.create({
        tournamentId: tournament._id,
        groupId: group._id,
        round: MatchRound.GROUP,
        matchNumber: nextMatchNumber++,
        homeTeamId: new Types.ObjectId(fixture.homeTeamId),
        awayTeamId: new Types.ObjectId(fixture.awayTeamId),
        status: MatchStatus.SCHEDULED,
      });
      createdMatches.push(match);
    }

    const populatedMatches = await this.matchModel
      .find({ _id: { $in: createdMatches.map((match) => match._id) } })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .exec();

    return {
      groupId,
      tournamentId: tournament._id.toString(),
      createdMatchesCount: populatedMatches.length,
      matches: populatedMatches,
    };
  }

  async generateTournamentGroupStage(tournamentId: string) {
    assertValidObjectId(tournamentId, 'tournamentId');
    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }

    const groups = await this.groupModel
      .find({ tournamentId })
      .sort({ code: 1 })
      .exec();

    const generatedGroups: Array<{
      groupId: string;
      code: string;
      createdMatchesCount: number;
    }> = [];
    const skippedGroups: Array<{ groupId: string; code: string; reason: string }> =
      [];
    const allMatches: Match[] = [];
    let createdMatchesCount = 0;

    for (const group of groups) {
      const groupId = group._id.toString();
      const existingMatches = await this.matchModel
        .countDocuments({ groupId, round: MatchRound.GROUP })
        .exec();

      if (existingMatches > 0) {
        skippedGroups.push({
          groupId,
          code: group.code,
          reason: 'Group-stage fixtures already exist',
        });
        continue;
      }

      try {
        const result = await this.generateGroupFixtures(groupId);
        generatedGroups.push({
          groupId,
          code: group.code,
          createdMatchesCount: result.createdMatchesCount,
        });
        createdMatchesCount += result.createdMatchesCount;
        allMatches.push(...result.matches);
      } catch (error) {
        if (error instanceof BadRequestException) {
          skippedGroups.push({
            groupId,
            code: group.code,
            reason: error.message,
          });
          continue;
        }
        throw error;
      }
    }

    return {
      tournamentId,
      generatedGroupsCount: generatedGroups.length,
      skippedGroupsCount: skippedGroups.length,
      createdMatchesCount,
      generatedGroups,
      skippedGroups,
      matches: allMatches,
    };
  }

  private async validateGroupReadyForFixtures(groupId: string) {
    assertValidObjectId(groupId, 'groupId');
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }

    const tournamentId =
      group.tournamentId instanceof Types.ObjectId
        ? group.tournamentId
        : group.tournamentId._id;
    const tournament = await this.tournamentModel
      .findById(tournamentId)
      .exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId.toString()}" not found`,
      );
    }

    const groupTeams = await this.groupTeamModel
      .find({ groupId })
      .sort({ seed: 1 })
      .exec();

    if (groupTeams.length !== tournament.teamsPerGroup) {
      throw new BadRequestException(
        `Group must have exactly ${tournament.teamsPerGroup} teams before generating fixtures`,
      );
    }

    const teamIds = groupTeams.map((groupTeam) => {
      const teamId =
        groupTeam.teamId instanceof Types.ObjectId
          ? groupTeam.teamId
          : groupTeam.teamId._id;
      return teamId.toString();
    });
    return { group, tournament, teamIds };
  }

  private async getNextMatchNumber(tournamentId: string): Promise<number> {
    const lastMatch = await this.matchModel
      .findOne({ tournamentId })
      .sort({ matchNumber: -1 })
      .exec();
    return lastMatch ? lastMatch.matchNumber + 1 : 1;
  }

  ensureMatchCanBeUpdated(match: Match): void {
    if (match.status === MatchStatus.COMPLETED) {
      throw new ConflictException('Completed matches cannot be modified');
    }
  }

  private applyTeamSwapSideEffects(
    match: Match,
    updatePayload: Record<string, unknown>,
  ): void {
    this.swapOptionalFields(match, updatePayload, 'homeScore', 'awayScore');
    this.swapOptionalFields(
      match,
      updatePayload,
      'extraTimeHomeScore',
      'extraTimeAwayScore',
    );
    this.swapOptionalFields(
      match,
      updatePayload,
      'penaltiesHomeScore',
      'penaltiesAwayScore',
    );

    if (match.winnerTeamId) {
      const winnerId = match.winnerTeamId.toString();
      const homeId = match.homeTeamId.toString();
      const awayId = match.awayTeamId.toString();

      if (winnerId === homeId) {
        updatePayload.winnerTeamId = match.awayTeamId;
      } else if (winnerId === awayId) {
        updatePayload.winnerTeamId = match.homeTeamId;
      }
    }

    if (match.loserTeamId) {
      const loserId = match.loserTeamId.toString();
      const homeId = match.homeTeamId.toString();
      const awayId = match.awayTeamId.toString();

      if (loserId === homeId) {
        updatePayload.loserTeamId = match.awayTeamId;
      } else if (loserId === awayId) {
        updatePayload.loserTeamId = match.homeTeamId;
      }
    }
  }

  private swapOptionalFields(
    match: Match,
    updatePayload: Record<string, unknown>,
    homeKey: keyof Match,
    awayKey: keyof Match,
  ): void {
    const homeValue = match[homeKey];
    const awayValue = match[awayKey];

    if (homeValue !== undefined || awayValue !== undefined) {
      updatePayload[homeKey as string] = awayValue;
      updatePayload[awayKey as string] = homeValue;
    }
  }

  private assertTeamsAreDifferent(homeTeamId: string, awayTeamId: string) {
    if (homeTeamId === awayTeamId) {
      throw new BadRequestException(
        'homeTeamId and awayTeamId must not be the same',
      );
    }
  }

  private async validateTournamentExists(tournamentId: string) {
    assertValidObjectId(tournamentId, 'tournamentId');
    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }
    return tournament;
  }

  private async validateTeamExists(teamId: string, field: string) {
    assertValidObjectId(teamId, field);
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) {
      throw new NotFoundException(`Team with id "${teamId}" not found`);
    }
    return team;
  }

  private async validateGroupBelongsToTournament(
    groupId: string,
    tournamentId: string,
  ) {
    assertValidObjectId(groupId, 'groupId');
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }
    const groupTournamentId =
      group.tournamentId instanceof Types.ObjectId
        ? group.tournamentId
        : group.tournamentId._id;
    if (groupTournamentId.toString() !== tournamentId) {
      throw new BadRequestException(
        'groupId does not belong to the provided tournamentId',
      );
    }
    return group;
  }

  private async assertNoDuplicateGroupFixture(
    groupId: string,
    homeTeamId: string,
    awayTeamId: string,
  ) {
    const existing = await this.matchModel
      .findOne({
        groupId,
        $or: [
          { homeTeamId, awayTeamId },
          { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
        ],
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        'A fixture between these teams already exists in this group',
      );
    }
  }
}

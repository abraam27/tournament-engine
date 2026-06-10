import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match } from 'src/matches/schemas/match.schema';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { Group } from 'src/groups/schemas/group.schema';
import { Stage } from 'src/stages/stage.schema';
import { BracketSlot } from 'src/bracket-slots/bracket-slot.schema';
import { StandingsService } from 'src/standings/standings.service';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { MatchStatus } from 'src/matches/enums/match-status.enum';
import { StageType } from 'src/stages/enums/stage-type.enum';
import { StageStatus } from 'src/stages/enums/stage-status.enum';
import { BracketSlotPosition } from 'src/bracket-slots/enums/bracket-slot-position.enum';
import { BracketSourceType } from 'src/bracket-slots/enums/bracket-source-type.enum';
import { assertValidObjectId } from 'src/common/utils/mongoose.util';
import {
  ROUND_OF_32_TEMPLATE,
  RoundOf32TemplateMatch,
} from './round-of-32-template';
import { TournamentGroupStandings } from './interfaces/tournament-group-standings.interface';
import {
  ResolvedBracketMatch,
  ResolvedBracketSlot,
} from './interfaces/resolved-bracket-match.interface';
import { StandingRow } from 'src/standings/interfaces/standing-row.interface';

const KNOCKOUT_ROUNDS = [
  MatchRound.ROUND_32,
  MatchRound.ROUND_16,
  MatchRound.QUARTER_FINAL,
  MatchRound.SEMI_FINAL,
  MatchRound.THIRD_PLACE,
  MatchRound.FINAL,
];

@Injectable()
export class BracketsService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(Stage.name) private readonly stageModel: Model<Stage>,
    @InjectModel(BracketSlot.name)
    private readonly bracketSlotModel: Model<BracketSlot>,
    private readonly standingsService: StandingsService,
  ) {}

  async generateRoundOf32(tournamentId: string) {
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

    const requiredGroups = tournament.groupsCount ?? 12;
    if (groups.length < requiredGroups) {
      throw new BadRequestException(
        `Tournament must have at least ${requiredGroups} groups before generating Round of 32`,
      );
    }

    await this.validateGroupStageCompleted(
      tournamentId,
      tournament.teamsPerGroup,
      groups,
    );

    const tournamentStandings =
      await this.standingsService.getTournamentStandings(tournamentId);

    for (const groupStanding of tournamentStandings.groups) {
      if (groupStanding.standings.length < 3) {
        throw new BadRequestException(
          `Group "${groupStanding.group.code}" must have at least 3 teams in standings`,
        );
      }
    }

    const qualifiedTeamsMap = this.buildQualifiedTeamsMap(
      tournamentStandings.groups,
    );

    if (Object.keys(qualifiedTeamsMap).length < 32) {
      throw new BadRequestException('Fewer than 32 qualified teams found');
    }

    const existingRound32Count = await this.matchModel
      .countDocuments({ tournamentId, round: MatchRound.ROUND_32 })
      .exec();

    if (existingRound32Count > 0) {
      throw new ConflictException(
        'Round of 32 bracket already exists for this tournament',
      );
    }

    const resolvedMatches = this.resolveBracketTemplate(
      ROUND_OF_32_TEMPLATE,
      qualifiedTeamsMap,
    );

    let stage = await this.stageModel
      .findOne({ tournamentId, round: MatchRound.ROUND_32 })
      .exec();

    if (!stage) {
      stage = await this.stageModel.create({
        tournamentId,
        name: 'Round of 32',
        type: StageType.KNOCKOUT,
        round: MatchRound.ROUND_32,
        order: 2,
        status: StageStatus.PENDING,
      });
    }

    const maxMatch = await this.matchModel
      .findOne({ tournamentId })
      .sort({ matchNumber: -1 })
      .exec();

    let nextMatchNumber = (maxMatch?.matchNumber ?? 0) + 1;
    const createdMatches: Match[] = [];

    for (const resolvedMatch of resolvedMatches) {
      const match = await this.matchModel.create({
        tournamentId,
        stageId: stage._id,
        round: MatchRound.ROUND_32,
        matchNumber: nextMatchNumber,
        homeTeamId: resolvedMatch.homeTeamId,
        awayTeamId: resolvedMatch.awayTeamId,
        status: MatchStatus.SCHEDULED,
      });

      nextMatchNumber += 1;

      await this.bracketSlotModel.insertMany(
        resolvedMatch.slots.map((slot) => ({
          tournamentId,
          stageId: stage!._id,
          matchId: match._id,
          round: MatchRound.ROUND_32,
          slot: slot.slot,
          sourceType: slot.sourceType,
          sourceRef: slot.sourceRef,
          teamId: slot.teamId,
        })),
      );

      const populatedMatch = await this.matchModel
        .findById(match._id)
        .populate('homeTeamId')
        .populate('awayTeamId')
        .exec();

      if (populatedMatch) {
        createdMatches.push(populatedMatch);
      }
    }

    return {
      tournamentId,
      stageId: stage._id.toString(),
      round: MatchRound.ROUND_32,
      createdMatchesCount: createdMatches.length,
      matches: createdMatches,
      qualifiedTeams: qualifiedTeamsMap,
    };
  }

  async getBracket(tournamentId: string, round: string) {
    assertValidObjectId(tournamentId, 'tournamentId');
    this.assertValidKnockoutRound(round);

    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }

    const matches = await this.matchModel
      .find({ tournamentId, round })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .exec();

    const matchIds = matches.map((match) => match._id);
    const slots = await this.bracketSlotModel
      .find({ tournamentId, round, matchId: { $in: matchIds } })
      .sort({ slot: 1 })
      .exec();

    const slotsByMatchId = new Map<string, BracketSlot[]>();
    for (const slot of slots) {
      const matchId = slot.matchId.toString();
      const existing = slotsByMatchId.get(matchId) ?? [];
      existing.push(slot);
      slotsByMatchId.set(matchId, existing);
    }

    return {
      tournamentId,
      round,
      matches: matches.map((match) => {
        const homeTeam = this.mapPopulatedTeam(match.homeTeamId);
        const awayTeam = this.mapPopulatedTeam(match.awayTeamId);
        const matchSlots = slotsByMatchId.get(match._id.toString()) ?? [];

        return {
          matchId: match._id.toString(),
          matchNumber: match.matchNumber,
          homeTeam,
          awayTeam,
          status: match.status,
          slots: matchSlots.map((slot) => ({
            slot: slot.slot,
            sourceType: slot.sourceType,
            sourceRef: slot.sourceRef,
            teamId: slot.teamId?.toString(),
          })),
        };
      }),
    };
  }

  async getQualifiedTeams(tournamentId: string) {
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

    const requiredGroups = tournament.groupsCount ?? 12;
    if (groups.length < requiredGroups) {
      throw new BadRequestException(
        `Tournament must have at least ${requiredGroups} groups`,
      );
    }

    await this.validateGroupStageCompleted(
      tournamentId,
      tournament.teamsPerGroup,
      groups,
    );

    const tournamentStandings =
      await this.standingsService.getTournamentStandings(tournamentId);

    for (const groupStanding of tournamentStandings.groups) {
      if (groupStanding.standings.length < 3) {
        throw new BadRequestException(
          `Group "${groupStanding.group.code}" must have at least 3 teams in standings`,
        );
      }
    }

    const qualifiedTeams = this.buildQualifiedTeamsMap(
      tournamentStandings.groups,
    );

    if (Object.keys(qualifiedTeams).length < 32) {
      throw new BadRequestException('Fewer than 32 qualified teams found');
    }

    return {
      tournamentId,
      qualifiedTeams,
    };
  }

  buildQualifiedTeamsMap(
    tournamentStandings: TournamentGroupStandings[],
  ): Record<string, string> {
    const qualifiedTeams: Record<string, string> = {};

    for (const groupStanding of tournamentStandings) {
      const groupCode = groupStanding.group.code.toUpperCase();
      const firstPlace = groupStanding.standings.find(
        (standing) => standing.rank === 1,
      );
      const secondPlace = groupStanding.standings.find(
        (standing) => standing.rank === 2,
      );

      if (firstPlace) {
        qualifiedTeams[`${groupCode}1`] = firstPlace.teamId;
      }
      if (secondPlace) {
        qualifiedTeams[`${groupCode}2`] = secondPlace.teamId;
      }
    }

    const bestThirdPlacedTeams =
      this.getBestThirdPlacedTeams(tournamentStandings);

    bestThirdPlacedTeams.forEach((standing, index) => {
      qualifiedTeams[`BEST_THIRD_${index + 1}`] = standing.teamId;
    });

    return qualifiedTeams;
  }

  getBestThirdPlacedTeams(
    tournamentStandings: TournamentGroupStandings[],
  ): StandingRow[] {
    const thirdPlaceTeams = tournamentStandings
      .map((groupStanding) =>
        groupStanding.standings.find((standing) => standing.rank === 3),
      )
      .filter((standing): standing is StandingRow => standing !== undefined);

    return this.sortThirdPlaceTeams(thirdPlaceTeams);
  }

  sortThirdPlaceTeams(thirdPlaceTeams: StandingRow[]): StandingRow[] {
    const sorted = this.standingsService.sortStandings(thirdPlaceTeams);
    return sorted.slice(0, 8);
  }

  resolveBracketTemplate(
    template: RoundOf32TemplateMatch[],
    qualifiedTeamsMap: Record<string, string>,
  ): ResolvedBracketMatch[] {
    return template.map((fixture) => {
      const homeTeamId = qualifiedTeamsMap[fixture.home];
      const awayTeamId = qualifiedTeamsMap[fixture.away];

      if (!homeTeamId) {
        throw new BadRequestException(
          `Cannot resolve bracket source "${fixture.home}"`,
        );
      }
      if (!awayTeamId) {
        throw new BadRequestException(
          `Cannot resolve bracket source "${fixture.away}"`,
        );
      }

      const slots: ResolvedBracketSlot[] = [
        {
          slot: BracketSlotPosition.HOME,
          sourceType: this.resolveSourceType(fixture.home),
          sourceRef: fixture.home,
          teamId: homeTeamId,
        },
        {
          slot: BracketSlotPosition.AWAY,
          sourceType: this.resolveSourceType(fixture.away),
          sourceRef: fixture.away,
          teamId: awayTeamId,
        },
      ];

      return {
        homeSourceRef: fixture.home,
        awaySourceRef: fixture.away,
        homeTeamId,
        awayTeamId,
        slots,
      };
    });
  }

  resolveSourceType(sourceRef: string): BracketSourceType {
    if (sourceRef.startsWith('BEST_THIRD_')) {
      return BracketSourceType.BEST_THIRD;
    }
    if (sourceRef.endsWith('1') || sourceRef.endsWith('2')) {
      return BracketSourceType.GROUP_RANK;
    }
    if (sourceRef.startsWith('WINNER_MATCH_')) {
      return BracketSourceType.MATCH_WINNER;
    }
    if (sourceRef.startsWith('LOSER_MATCH_')) {
      return BracketSourceType.MATCH_LOSER;
    }

    throw new BadRequestException(`Unknown bracket source ref "${sourceRef}"`);
  }

  async validateGroupStageCompleted(
    tournamentId: string,
    teamsPerGroup: number,
    groups: Group[],
  ): Promise<void> {
    const expectedMatchesPerGroup =
      (teamsPerGroup * (teamsPerGroup - 1)) / 2;
    const incompleteGroups: string[] = [];

    for (const group of groups) {
      const completedCount = await this.matchModel
        .countDocuments({
          tournamentId,
          groupId: group._id,
          round: MatchRound.GROUP,
          status: MatchStatus.COMPLETED,
          homeScore: { $exists: true },
          awayScore: { $exists: true },
        })
        .exec();

      if (completedCount !== expectedMatchesPerGroup) {
        incompleteGroups.push(group.code);
      }
    }

    if (incompleteGroups.length > 0) {
      throw new BadRequestException(
        `Group stage is incomplete for groups: ${incompleteGroups.join(', ')}. Expected ${expectedMatchesPerGroup} completed matches per group.`,
      );
    }
  }

  private assertValidKnockoutRound(round: string): asserts round is MatchRound {
    if (!KNOCKOUT_ROUNDS.includes(round as MatchRound)) {
      throw new BadRequestException(
        `round must be one of: ${KNOCKOUT_ROUNDS.join(', ')}`,
      );
    }
  }

  private mapPopulatedTeam(team: unknown) {
    if (!team || typeof team !== 'object') {
      return null;
    }

    const populatedTeam = team as {
      _id?: { toString(): string };
      name?: string;
      code?: string;
    };

    return {
      _id: populatedTeam._id?.toString(),
      name: populatedTeam.name,
      code: populatedTeam.code,
    };
  }
}

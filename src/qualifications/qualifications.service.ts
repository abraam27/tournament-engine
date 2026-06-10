import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match } from 'src/matches/schemas/match.schema';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { Group } from 'src/groups/schemas/group.schema';
import { StandingsService } from 'src/standings/standings.service';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { MatchStatus } from 'src/matches/enums/match-status.enum';
import { assertValidObjectId } from 'src/common/utils/mongoose.util';
import { QualificationType } from './enums/qualification-type.enum';
import {
  ThirdPlaceCandidate,
  TournamentGroupStandings,
} from './interfaces/tournament-group-standings.interface';
import {
  AutomaticQualifiedTeam,
  BestThirdQualifiedTeam,
  ThirdPlaceRankingEntry,
} from './interfaces/qualified-team.interface';
@Injectable()
export class QualificationsService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    private readonly standingsService: StandingsService,
  ) {}

  async getQualifiedTeams(tournamentId: string) {
    const { tournamentStandings } =
      await this.validateTournamentReadyForQualification(tournamentId);

    const automaticQualified =
      this.getAutomaticQualifiedTeams(tournamentStandings);
    const bestThirdQualified =
      this.getBestThirdQualifiedTeams(tournamentStandings);
    const qualifiedMap = this.buildQualifiedMap(
      automaticQualified,
      bestThirdQualified,
    );

    const totalQualified =
      automaticQualified.length + bestThirdQualified.length;

    if (totalQualified !== 32) {
      throw new BadRequestException(
        `Expected 32 qualified teams but found ${totalQualified}`,
      );
    }

    return {
      tournamentId,
      totalQualified,
      automaticQualified,
      bestThirdQualified,
      qualifiedMap,
    };
  }

  async getThirdPlaceRanking(tournamentId: string) {
    const { tournamentStandings } =
      await this.validateTournamentReadyForQualification(tournamentId);

    const thirdPlaceCandidates =
      this.collectThirdPlaceCandidates(tournamentStandings);
    const sortedCandidates = this.sortThirdPlacedTeams(thirdPlaceCandidates);

    const ranking: ThirdPlaceRankingEntry[] = sortedCandidates.map(
      (candidate, index) => ({
        thirdPlaceRank: index + 1,
        qualified: index + 1 <= 8,
        originalGroupSourceRef: candidate.originalGroupSourceRef,
        groupId: candidate.groupId,
        groupCode: candidate.groupCode,
        teamId: candidate.standing.teamId,
        team: candidate.standing.team,
        points: candidate.standing.points,
        goalDifference: candidate.standing.goalDifference,
        goalsFor: candidate.standing.goalsFor,
      }),
    );

    return {
      tournamentId,
      ranking,
    };
  }

  async getGroupWinners(tournamentId: string) {
    const { tournamentStandings } =
      await this.validateTournamentReadyForQualification(tournamentId);

    const automaticQualified =
      this.getAutomaticQualifiedTeams(tournamentStandings);

    return {
      tournamentId,
      groupWinners: automaticQualified,
    };
  }

  async validateTournamentReadyForQualification(tournamentId: string): Promise<{
    tournament: Tournament;
    groups: Group[];
    tournamentStandings: TournamentGroupStandings[];
  }> {
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

    const tournamentStandingsResult =
      await this.standingsService.getTournamentStandings(tournamentId);
    const tournamentStandings = tournamentStandingsResult.groups;

    for (const groupStanding of tournamentStandings) {
      if (groupStanding.standings.length < 3) {
        throw new BadRequestException(
          `Group "${groupStanding.group.code}" must have at least 3 teams in standings`,
        );
      }
    }

    const thirdPlaceCount = this.collectThirdPlaceCandidates(
      tournamentStandings,
    ).length;

    if (thirdPlaceCount < 8) {
      throw new BadRequestException(
        `At least 8 third-place teams are required but found ${thirdPlaceCount}`,
      );
    }

    return { tournament, groups, tournamentStandings };
  }

  getAutomaticQualifiedTeams(
    tournamentStandings: TournamentGroupStandings[],
  ): AutomaticQualifiedTeam[] {
    const automaticQualified: AutomaticQualifiedTeam[] = [];

    for (const groupStanding of tournamentStandings) {
      const groupCode = groupStanding.group.code.toUpperCase();

      for (const rank of [1, 2]) {
        const standing = groupStanding.standings.find(
          (entry) => entry.rank === rank,
        );

        if (!standing) {
          continue;
        }

        automaticQualified.push({
          sourceRef: `${groupCode}${rank}`,
          qualificationType: QualificationType.GROUP_RANK,
          groupId: groupStanding.groupId,
          groupCode,
          rank,
          teamId: standing.teamId,
          team: standing.team,
          points: standing.points,
          goalDifference: standing.goalDifference,
          goalsFor: standing.goalsFor,
        });
      }
    }

    return automaticQualified.sort((a, b) =>
      a.sourceRef.localeCompare(b.sourceRef),
    );
  }

  getBestThirdQualifiedTeams(
    tournamentStandings: TournamentGroupStandings[],
  ): BestThirdQualifiedTeam[] {
    const thirdPlaceCandidates =
      this.collectThirdPlaceCandidates(tournamentStandings);
    const sortedCandidates = this.sortThirdPlacedTeams(thirdPlaceCandidates);

    return sortedCandidates.slice(0, 8).map((candidate, index) => ({
      sourceRef: `BEST_THIRD_${index + 1}`,
      qualificationType: QualificationType.BEST_THIRD,
      originalGroupSourceRef: candidate.originalGroupSourceRef,
      groupId: candidate.groupId,
      groupCode: candidate.groupCode,
      rank: 3,
      teamId: candidate.standing.teamId,
      team: candidate.standing.team,
      points: candidate.standing.points,
      goalDifference: candidate.standing.goalDifference,
      goalsFor: candidate.standing.goalsFor,
      thirdPlaceRank: index + 1,
    }));
  }

  buildQualifiedMap(
    automaticQualified: AutomaticQualifiedTeam[],
    bestThirdQualified: BestThirdQualifiedTeam[],
  ): Record<string, string> {
    const qualifiedMap: Record<string, string> = {};

    for (const team of automaticQualified) {
      qualifiedMap[team.sourceRef] = team.teamId;
    }

    for (const team of bestThirdQualified) {
      qualifiedMap[team.sourceRef] = team.teamId;
    }

    return qualifiedMap;
  }

  collectThirdPlaceCandidates(
    tournamentStandings: TournamentGroupStandings[],
  ): ThirdPlaceCandidate[] {
    return tournamentStandings
      .map((groupStanding) => {
        const groupCode = groupStanding.group.code.toUpperCase();
        const thirdPlace = groupStanding.standings.find(
          (standing) => standing.rank === 3,
        );

        if (!thirdPlace) {
          return null;
        }

        return {
          groupId: groupStanding.groupId,
          groupCode,
          originalGroupSourceRef: `${groupCode}3`,
          standing: thirdPlace,
        };
      })
      .filter((candidate): candidate is ThirdPlaceCandidate => candidate !== null);
  }

  sortThirdPlacedTeams(
    thirdPlacedTeams: ThirdPlaceCandidate[],
  ): ThirdPlaceCandidate[] {
    const sortedStandings = this.standingsService.sortStandings(
      thirdPlacedTeams.map((candidate) => candidate.standing),
    );

    const standingOrder = new Map(
      sortedStandings.map((standing, index) => [standing.teamId, index]),
    );

    return [...thirdPlacedTeams].sort(
      (a, b) =>
        (standingOrder.get(a.standing.teamId) ?? 0) -
        (standingOrder.get(b.standing.teamId) ?? 0),
    );
  }

  private async validateGroupStageCompleted(
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
}

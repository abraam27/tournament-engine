import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from 'src/groups/schemas/group.schema';
import { GroupTeam } from 'src/groups/schemas/group-team.schema';
import { Match } from 'src/matches/schemas/match.schema';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { MatchStatus } from 'src/matches/enums/match-status.enum';
import { assertValidObjectId } from 'src/common/utils/mongoose.util';
import { buildFlagCdnUrl } from 'src/teams/utils/flag-url.util';
import {
  StandingMatchInput,
  StandingRow,
  StandingTeamInput,
} from './interfaces/standing-row.interface';

@Injectable()
export class StandingsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupTeam.name)
    private readonly groupTeamModel: Model<GroupTeam>,
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
  ) {}

  async getGroupStandings(groupId: string) {
    assertValidObjectId(groupId, 'groupId');
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }

    const groupTeams = await this.groupTeamModel
      .find({ groupId })
      .populate('teamId')
      .sort({ seed: 1 })
      .exec();

    const completedMatches = await this.matchModel
      .find({
        groupId,
        round: MatchRound.GROUP,
        status: MatchStatus.COMPLETED,
        homeScore: { $exists: true },
        awayScore: { $exists: true },
      })
      .exec();

    const standings = this.calculateStandings(
      this.mapGroupTeams(groupTeams),
      this.mapCompletedMatches(completedMatches),
    );

    return {
      groupId,
      group: {
        _id: group._id.toString(),
        name: group.name,
        code: group.code,
      },
      standings,
    };
  }

  async getTournamentStandings(tournamentId: string) {
    assertValidObjectId(tournamentId, 'tournamentId');
    const tournament = await this.tournamentModel
      .findById(tournamentId)
      .exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }

    const groups = await this.groupModel
      .find({ tournamentId })
      .sort({ code: 1 })
      .exec();

    const groupStandings = await Promise.all(
      groups.map(async (group) => {
        const result = await this.getGroupStandings(group._id.toString());
        return {
          groupId: result.groupId,
          group: result.group,
          standings: result.standings,
        };
      }),
    );

    return {
      tournamentId,
      groups: groupStandings,
    };
  }

  async findStandings(filters: {
    tournamentId?: string;
    groupId?: string;
  }) {
    if (filters.groupId) {
      return this.getGroupStandings(filters.groupId);
    }

    if (filters.tournamentId) {
      return this.getTournamentStandings(filters.tournamentId);
    }

    return { standings: [] };
  }

  calculateStandings(
    groupTeams: StandingTeamInput[],
    completedMatches: StandingMatchInput[],
  ): StandingRow[] {
    const standingsMap = new Map<string, StandingRow>();

    for (const groupTeam of groupTeams) {
      standingsMap.set(groupTeam.teamId, {
        teamId: groupTeam.teamId,
        team: groupTeam.team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        rank: 0,
      });
    }

    for (const match of completedMatches) {
      const homeStanding = standingsMap.get(match.homeTeamId);
      const awayStanding = standingsMap.get(match.awayTeamId);

      if (!homeStanding || !awayStanding) {
        continue;
      }

      homeStanding.played += 1;
      awayStanding.played += 1;
      homeStanding.goalsFor += match.homeScore;
      homeStanding.goalsAgainst += match.awayScore;
      awayStanding.goalsFor += match.awayScore;
      awayStanding.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        homeStanding.won += 1;
        homeStanding.points += 3;
        awayStanding.lost += 1;
      } else if (match.homeScore < match.awayScore) {
        awayStanding.won += 1;
        awayStanding.points += 3;
        homeStanding.lost += 1;
      } else {
        homeStanding.drawn += 1;
        awayStanding.drawn += 1;
        homeStanding.points += 1;
        awayStanding.points += 1;
      }
    }

    const standings = Array.from(standingsMap.values()).map((standing) => ({
      ...standing,
      goalDifference: standing.goalsFor - standing.goalsAgainst,
    }));

    return this.sortStandings(standings);
  }

  sortStandings(standings: StandingRow[]): StandingRow[] {
    const sorted = [...standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      return b.goalsFor - a.goalsFor;
    });

    return sorted.map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));
  }

  private mapGroupTeams(
    groupTeams: Array<{
      teamId: {
        _id?: { toString(): string };
        toString(): string;
        name?: string;
        code?: string;
        flagUrl?: string;
      };
    }>,
  ): StandingTeamInput[] {
    return groupTeams.map((groupTeam) => {
      const team = groupTeam.teamId;
      const teamId =
        typeof team === 'object' && team !== null && '_id' in team && team._id
          ? team._id.toString()
          : team.toString();

      return {
        teamId,
        team: {
          _id: teamId,
          name:
            typeof team === 'object' && team !== null && 'name' in team
              ? (team.name as string)
              : '',
          code:
            typeof team === 'object' && team !== null && 'code' in team
              ? (team.code as string)
              : '',
          ...(typeof team === 'object' &&
          team !== null &&
          'flagUrl' in team &&
          team.flagUrl
            ? { flagUrl: buildFlagCdnUrl(team.flagUrl) }
            : {}),
        },
      };
    });
  }

  private mapCompletedMatches(
    matches: Array<{
      homeTeamId: { toString(): string };
      awayTeamId: { toString(): string };
      homeScore?: number;
      awayScore?: number;
    }>,
  ): StandingMatchInput[] {
    return matches
      .filter(
        (match) =>
          match.homeScore !== undefined && match.awayScore !== undefined,
      )
      .map((match) => ({
        homeTeamId: match.homeTeamId.toString(),
        awayTeamId: match.awayTeamId.toString(),
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
      }));
  }
}

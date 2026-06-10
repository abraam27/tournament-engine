import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Tournament } from './schemas/tournament.schema';
import { TournamentStatus } from './enums/tournament-status.enum';
import { Team } from 'src/teams/schemas/team.schema';
import { Group } from 'src/groups/schemas/group.schema';
import { GroupTeam } from 'src/groups/schemas/group-team.schema';
import { GroupsService } from 'src/groups/groups.service';
import {
  WorldCupSeedData,
  WorldCupSeedTeam,
} from './interfaces/world-cup-seed.interface';
import { handleDuplicateKeyError } from 'src/common/utils/mongoose.util';

@Injectable()
export class TournamentsSeedService {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupTeam.name)
    private readonly groupTeamModel: Model<GroupTeam>,
    private readonly groupsService: GroupsService,
  ) {}

  async seedWorldCup2026() {
    const seedData = this.loadSeedData();
    const tournament = await this.findOrCreateTournament(seedData.tournament);

    let teamsCreated = 0;
    let teamsUpdated = 0;
    let groupsCreated = 0;
    let assignmentsCreated = 0;
    let assignmentsSkipped = 0;

    const seededGroups: Array<{
      group: string;
      groupId: string;
      teams: Array<{ teamId: string; code: string; assignmentId?: string }>;
    }> = [];

    for (const groupData of seedData.groups) {
      const group = await this.findOrCreateGroup(
        tournament._id.toString(),
        groupData.group,
      );
      if (group.wasCreated) {
        groupsCreated++;
      }

      const seededTeams: Array<{
        teamId: string;
        code: string;
        assignmentId?: string;
      }> = [];

      for (let index = 0; index < groupData.teams.length; index++) {
        const teamData = groupData.teams[index];
        const { team, wasCreated } = await this.upsertTeam(teamData);
        if (wasCreated) {
          teamsCreated++;
        } else {
          teamsUpdated++;
        }

        const existingAssignment = await this.groupTeamModel
          .findOne({
            groupId: group.document._id,
            teamId: team._id,
          })
          .exec();

        if (existingAssignment) {
          assignmentsSkipped++;
          seededTeams.push({
            teamId: team._id.toString(),
            code: team.code,
            assignmentId: existingAssignment._id.toString(),
          });
          continue;
        }

        const assignment = await this.groupsService.assignTeamToGroup(
          group.document._id.toString(),
          {
            teamId: team._id.toString(),
            seed: index + 1,
          },
        );
        assignmentsCreated++;
        seededTeams.push({
          teamId: team._id.toString(),
          code: team.code,
          assignmentId: assignment._id.toString(),
        });
      }

      seededGroups.push({
        group: groupData.group,
        groupId: group.document._id.toString(),
        teams: seededTeams,
      });
    }

    return {
      tournament: {
        id: tournament._id.toString(),
        name: tournament.name,
        year: tournament.year,
      },
      groups: seededGroups,
      summary: {
        teamsCreated,
        teamsUpdated,
        groupsCreated,
        assignmentsCreated,
        assignmentsSkipped,
      },
    };
  }

  private loadSeedData(): WorldCupSeedData {
    const filePath = path.join(__dirname, '..', 'data', 'world-cup-2026-groups.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as WorldCupSeedData;
  }

  private async findOrCreateTournament(name: string): Promise<Tournament> {
    let tournament = await this.tournamentModel
      .findOne({ name, year: 2026 })
      .exec();

    if (tournament) {
      return tournament;
    }

    try {
      tournament = await this.tournamentModel.create({
        name,
        year: 2026,
        status: TournamentStatus.DRAFT,
        teamsCount: 48,
        groupsCount: 12,
        teamsPerGroup: 4,
        qualifiedPerGroup: 2,
        bestThirdCount: 8,
      });
      return tournament;
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  private async findOrCreateGroup(tournamentId: string, code: string) {
    let document = await this.groupModel
      .findOne({ tournamentId, code })
      .exec();
    let wasCreated = false;

    if (!document) {
      try {
        document = await this.groupModel.create({
          tournamentId: new Types.ObjectId(tournamentId),
          name: `Group ${code}`,
          code,
        });
        wasCreated = true;
      } catch (error) {
        handleDuplicateKeyError(error);
        throw error;
      }
    }

    return { document, wasCreated };
  }

  private async upsertTeam(teamData: WorldCupSeedTeam) {
    const existing = await this.teamModel
      .findOne({ code: teamData.code.toUpperCase() })
      .exec();

    const payload = {
      name: teamData.name,
      code: teamData.code.toUpperCase(),
      confederation: teamData.confederation,
      fifaRanking: teamData.fifaRanking,
      flagUrl: teamData.flagUrl,
      status: teamData.status,
    };

    if (existing) {
      existing.set(payload);
      const team = await existing.save();
      return { team, wasCreated: false };
    }

    try {
      const team = await this.teamModel.create(payload);
      return { team, wasCreated: true };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        const team = await this.teamModel
          .findOne({ code: teamData.code.toUpperCase() })
          .exec();
        if (!team) {
          throw new ConflictException('Failed to upsert team after duplicate key error');
        }
        team.set(payload);
        return { team: await team.save(), wasCreated: false };
      }
      throw error;
    }
  }
}

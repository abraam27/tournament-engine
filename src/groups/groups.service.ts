import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group } from './schemas/group.schema';
import { GroupTeam } from './schemas/group-team.schema';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { Team } from 'src/teams/schemas/team.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignTeamToGroupDto } from './dto/assign-team-to-group.dto';
import {
  assertValidObjectId,
  handleDuplicateKeyError,
} from 'src/common/utils/mongoose.util';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupTeam.name)
    private readonly groupTeamModel: Model<GroupTeam>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    assertValidObjectId(createGroupDto.tournamentId, 'tournamentId');
    const tournament = await this.tournamentModel
      .findById(createGroupDto.tournamentId)
      .exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${createGroupDto.tournamentId}" not found`,
      );
    }

    try {
      const group = new this.groupModel(createGroupDto);
      return await group.save();
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async findAll(tournamentId?: string): Promise<Group[]> {
    const filter = tournamentId ? { tournamentId } : {};
    if (tournamentId) {
      assertValidObjectId(tournamentId, 'tournamentId');
    }
    return this.groupModel.find(filter).sort({ code: 1 }).exec();
  }

  async findOne(id: string): Promise<Group> {
    assertValidObjectId(id, 'id');
    const group = await this.groupModel.findById(id).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${id}" not found`);
    }
    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    assertValidObjectId(id, 'id');
    try {
      const group = await this.groupModel
        .findByIdAndUpdate(id, updateGroupDto, {
          returnDocument: 'after',
          runValidators: true,
        })
        .exec();
      if (!group) {
        throw new NotFoundException(`Group with id "${id}" not found`);
      }
      return group;
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<Group> {
    assertValidObjectId(id, 'id');
    const group = await this.groupModel.findByIdAndDelete(id).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${id}" not found`);
    }
    await this.groupTeamModel.deleteMany({ groupId: id }).exec();
    return group;
  }

  async assignTeamToGroup(
    groupId: string,
    assignTeamToGroupDto: AssignTeamToGroupDto,
  ): Promise<GroupTeam> {
    assertValidObjectId(groupId, 'groupId');
    assertValidObjectId(assignTeamToGroupDto.teamId, 'teamId');

    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }

    const team = await this.teamModel
      .findById(assignTeamToGroupDto.teamId)
      .exec();
    if (!team) {
      throw new NotFoundException(
        `Team with id "${assignTeamToGroupDto.teamId}" not found`,
      );
    }

    const tournament = await this.tournamentModel
      .findById(group.tournamentId)
      .exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${group.tournamentId.toString()}" not found`,
      );
    }

    const existingInGroup = await this.groupTeamModel
      .findOne({ groupId, teamId: assignTeamToGroupDto.teamId })
      .exec();
    if (existingInGroup) {
      throw new ConflictException('Team is already assigned to this group');
    }

    const existingInTournament = await this.groupTeamModel
      .findOne({
        tournamentId: group.tournamentId,
        teamId: assignTeamToGroupDto.teamId,
      })
      .exec();
    if (existingInTournament) {
      throw new ConflictException(
        'Team is already assigned to another group in this tournament',
      );
    }

    const teamsInGroup = await this.groupTeamModel.countDocuments({ groupId });
    if (teamsInGroup >= tournament.teamsPerGroup) {
      throw new BadRequestException(
        `Group cannot exceed ${tournament.teamsPerGroup} teams`,
      );
    }

    try {
      const groupTeam = new this.groupTeamModel({
        tournamentId: group.tournamentId,
        groupId,
        teamId: assignTeamToGroupDto.teamId,
        seed: assignTeamToGroupDto.seed,
      });
      return await groupTeam.save();
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async getGroupTeams(groupId: string): Promise<GroupTeam[]> {
    assertValidObjectId(groupId, 'groupId');
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }
    return this.groupTeamModel
      .find({ groupId })
      .populate('teamId')
      .sort({ seed: 1 })
      .exec();
  }

  async removeTeamFromGroup(
    groupId: string,
    teamId: string,
  ): Promise<GroupTeam> {
    assertValidObjectId(groupId, 'groupId');
    assertValidObjectId(teamId, 'teamId');

    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }

    const groupTeam = await this.groupTeamModel
      .findOneAndDelete({ groupId, teamId })
      .exec();
    if (!groupTeam) {
      throw new NotFoundException(
        `Team with id "${teamId}" is not assigned to group "${groupId}"`,
      );
    }
    return groupTeam;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import {
  assertValidObjectId,
  handleDuplicateKeyError,
} from 'src/common/utils/mongoose.util';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<Team>,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    try {
      const team = new this.teamModel(createTeamDto);
      return await team.save();
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async findAll(search?: string): Promise<Team[]> {
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    return this.teamModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Team> {
    assertValidObjectId(id, 'id');
    const team = await this.teamModel.findById(id).exec();
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    assertValidObjectId(id, 'id');
    try {
      const team = await this.teamModel
        .findByIdAndUpdate(id, updateTeamDto, {
          returnDocument: 'after',
          runValidators: true,
        })
        .exec();
      if (!team) {
        throw new NotFoundException(`Team with id "${id}" not found`);
      }
      return team;
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<Team> {
    assertValidObjectId(id, 'id');
    const team = await this.teamModel.findByIdAndDelete(id).exec();
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    return team;
  }
}

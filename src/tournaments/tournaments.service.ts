import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tournament } from './schemas/tournament.schema';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import {
  assertValidObjectId,
  handleDuplicateKeyError,
} from 'src/common/utils/mongoose.util';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
  ) {}

  async create(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    try {
      const tournament = new this.tournamentModel(createTournamentDto);
      return await tournament.save();
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async findAll(): Promise<Tournament[]> {
    return this.tournamentModel.find().sort({ year: -1, name: 1 }).exec();
  }

  async findOne(id: string): Promise<Tournament> {
    assertValidObjectId(id, 'id');
    const tournament = await this.tournamentModel.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" not found`);
    }
    return tournament;
  }

  async update(
    id: string,
    updateTournamentDto: UpdateTournamentDto,
  ): Promise<Tournament> {
    assertValidObjectId(id, 'id');
    try {
      const tournament = await this.tournamentModel
        .findByIdAndUpdate(id, updateTournamentDto, {
          returnDocument: 'after',
          runValidators: true,
        })
        .exec();
      if (!tournament) {
        throw new NotFoundException(`Tournament with id "${id}" not found`);
      }
      return tournament;
    } catch (error) {
      handleDuplicateKeyError(error);
      throw error;
    }
  }

  async remove(id: string): Promise<Tournament> {
    assertValidObjectId(id, 'id');
    const tournament = await this.tournamentModel.findByIdAndDelete(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" not found`);
    }
    return tournament;
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CREATE_TOURNAMENT_EXAMPLE } from 'src/common/swagger/swagger-body.examples';
import { TournamentResponseDto } from 'src/common/swagger/swagger-response.dto';
import { TournamentsService } from './tournaments.service';
import { TournamentsSeedService } from './tournaments-seed.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Controller('tournaments')
@ApiTags('Tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly tournamentsSeedService: TournamentsSeedService,
  ) {}

  @Post('seed/world-cup-2026')
  @ApiOperation({
    summary: 'Seed World Cup 2026 tournament, groups, teams, and assignments',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tournament seeded from src/data/world-cup-2026-groups.json',
  })
  seedWorldCup2026() {
    return this.tournamentsSeedService.seedWorldCup2026();
  }

  @Post()
  @ApiOperation({ summary: 'Create a tournament' })
  @ApiBody({
    type: CreateTournamentDto,
    examples: { worldCup2026: { summary: 'World Cup 2026', value: CREATE_TOURNAMENT_EXAMPLE } },
  })
  @ApiCreatedResponse({ type: TournamentResponseDto, description: 'Tournament created' })
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tournaments' })
  @ApiResponse({ status: 200, description: 'List of tournaments' })
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tournament by id' })
  @ApiParam({ name: 'id', description: 'Tournament MongoId' })
  @ApiOkResponse({ type: TournamentResponseDto })
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tournament' })
  @ApiParam({ name: 'id', description: 'Tournament MongoId' })
  update(
    @Param('id') id: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tournament' })
  @ApiParam({ name: 'id', description: 'Tournament MongoId' })
  remove(@Param('id') id: string) {
    return this.tournamentsService.remove(id);
  }
}

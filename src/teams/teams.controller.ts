import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CREATE_TEAM_EXAMPLE } from 'src/common/swagger/swagger-body.examples';
import { TeamResponseDto } from 'src/common/swagger/swagger-response.dto';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('teams')
@ApiTags('Teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a team' })
  @ApiBody({
    type: CreateTeamDto,
    examples: { egypt: { summary: 'Egypt', value: CREATE_TEAM_EXAMPLE } },
  })
  @ApiCreatedResponse({ type: TeamResponseDto, description: 'Team created' })
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by team name or code (case-insensitive)',
    example: 'egy',
  })
  @ApiResponse({ status: 200, description: 'List of teams' })
  findAll(@Query('search') search?: string) {
    return this.teamsService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team by id' })
  @ApiParam({ name: 'id', description: 'Team MongoId' })
  @ApiOkResponse({ type: TeamResponseDto })
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team' })
  @ApiParam({ name: 'id', description: 'Team MongoId' })
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team' })
  @ApiParam({ name: 'id', description: 'Team MongoId' })
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}

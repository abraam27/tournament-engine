import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GroupStandingsResponseDto } from 'src/common/swagger/swagger-response.dto';
import { StandingsService } from './standings.service';
import { StandingRowDto } from './dto/standing-row.dto';

@Controller('standings')
@ApiTags('Standings')
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get standings by group' })
  @ApiParam({ name: 'groupId', description: 'Group MongoId' })
  @ApiOkResponse({
    type: GroupStandingsResponseDto,
    description: 'Group standings calculated from completed matches',
  })
  getGroupStandings(@Param('groupId') groupId: string) {
    return this.standingsService.getGroupStandings(groupId);
  }

  @Get('tournament/:tournamentId')
  @ApiOperation({ summary: 'Get standings for all groups in a tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiOkResponse({
    description: 'Tournament group standings calculated from completed matches',
  })
  getTournamentStandings(@Param('tournamentId') tournamentId: string) {
    return this.standingsService.getTournamentStandings(tournamentId);
  }

  @Get()
  @ApiOperation({ summary: 'Get standings with optional filters' })
  @ApiQuery({ name: 'tournamentId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  findStandings(
    @Query('tournamentId') tournamentId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.standingsService.findStandings({ tournamentId, groupId });
  }
}

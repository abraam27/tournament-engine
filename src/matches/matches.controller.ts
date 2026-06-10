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
import { SUBMIT_RESULT_EXAMPLES } from 'src/common/swagger/swagger-body.examples';
import { MatchResponseDto } from 'src/common/swagger/swagger-response.dto';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { ScheduleMatchDto } from './dto/schedule-match.dto';
import { SubmitMatchResultDto } from './dto/submit-match-result.dto';
import { MatchRound } from './enums/match-round.enum';
import { MatchStatus } from './enums/match-status.enum';

@Controller('matches')
@ApiTags('Matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('generate/group/:groupId')
  @ApiOperation({ summary: 'Generate group-stage fixtures for one group' })
  @ApiParam({ name: 'groupId', description: 'Group MongoId' })
  @ApiCreatedResponse({ description: 'Group fixtures generated' })
  generateGroupFixtures(@Param('groupId') groupId: string) {
    return this.matchesService.generateGroupFixtures(groupId);
  }

  @Post('generate/tournament/:tournamentId/group-stage')
  @ApiOperation({
    summary: 'Generate group-stage fixtures for all groups in a tournament',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiResponse({ status: 201, description: 'Tournament group fixtures generated' })
  generateTournamentGroupStage(
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.matchesService.generateTournamentGroupStage(tournamentId);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get fixtures by group' })
  @ApiParam({ name: 'groupId', description: 'Group MongoId' })
  @ApiOkResponse({
    type: MatchResponseDto,
    isArray: true,
    description: 'Group fixtures ordered by matchNumber',
  })
  findByGroup(@Param('groupId') groupId: string) {
    return this.matchesService.findByGroup(groupId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all matches with optional filters' })
  @ApiQuery({ name: 'tournamentId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'round', required: false, enum: MatchRound })
  @ApiQuery({ name: 'status', required: false, enum: MatchStatus })
  findAll(
    @Query('tournamentId') tournamentId?: string,
    @Query('groupId') groupId?: string,
    @Query('round') round?: MatchRound,
    @Query('status') status?: MatchStatus,
  ) {
    return this.matchesService.findAll({
      tournamentId,
      groupId,
      round,
      status,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a match manually' })
  @ApiResponse({ status: 201, description: 'Match created' })
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(createMatchDto);
  }

  @Post(':id/result')
  @ApiOperation({ summary: 'Submit match result for group or knockout matches' })
  @ApiParam({ name: 'id', description: 'Match MongoId' })
  @ApiBody({
    type: SubmitMatchResultDto,
    examples: SUBMIT_RESULT_EXAMPLES,
  })
  @ApiCreatedResponse({ type: MatchResponseDto, description: 'Match result submitted' })
  submitResult(
    @Param('id') id: string,
    @Body() submitMatchResultDto: SubmitMatchResultDto,
  ) {
    return this.matchesService.submitResult(id, submitMatchResultDto);
  }

  @Patch(':id/schedule')
  @ApiOperation({ summary: 'Schedule a match with date and stadium' })
  @ApiParam({ name: 'id', description: 'Match MongoId' })
  @ApiResponse({ status: 200, description: 'Match scheduled' })
  schedule(
    @Param('id') id: string,
    @Body() scheduleMatchDto: ScheduleMatchDto,
  ) {
    return this.matchesService.schedule(id, scheduleMatchDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update match status' })
  @ApiParam({ name: 'id', description: 'Match MongoId' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateMatchStatusDto: UpdateMatchStatusDto,
  ) {
    return this.matchesService.updateStatus(id, updateMatchStatusDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get match by id' })
  @ApiParam({ name: 'id', description: 'Match MongoId' })
  @ApiOkResponse({ type: MatchResponseDto })
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update match details' })
  @ApiParam({ name: 'id', description: 'Match MongoId' })
  update(@Param('id') id: string, @Body() updateMatchDto: UpdateMatchDto) {
    return this.matchesService.update(id, updateMatchDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a match' })
  @ApiParam({ name: 'id', description: 'Match MongoId' })
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }
}

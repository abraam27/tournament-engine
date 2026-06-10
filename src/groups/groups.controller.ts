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
import {
  ASSIGN_TEAM_EXAMPLE,
  CREATE_GROUP_EXAMPLE,
} from 'src/common/swagger/swagger-body.examples';
import { GroupResponseDto } from 'src/common/swagger/swagger-response.dto';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignTeamToGroupDto } from './dto/assign-team-to-group.dto';

@Controller('groups')
@ApiTags('Groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a group' })
  @ApiBody({
    type: CreateGroupDto,
    examples: { groupA: { summary: 'Group A', value: CREATE_GROUP_EXAMPLE } },
  })
  @ApiCreatedResponse({ type: GroupResponseDto, description: 'Group created' })
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups' })
  @ApiQuery({
    name: 'tournamentId',
    required: false,
    description: 'Filter groups by tournament',
  })
  @ApiResponse({ status: 200, description: 'List of groups' })
  findAll(@Query('tournamentId') tournamentId?: string) {
    return this.groupsService.findAll(tournamentId);
  }

  @Post(':groupId/teams')
  @ApiOperation({ summary: 'Assign a team to a group' })
  @ApiParam({ name: 'groupId', description: 'Group MongoId' })
  @ApiBody({
    type: AssignTeamToGroupDto,
    examples: { assignEgypt: { summary: 'Assign Egypt', value: ASSIGN_TEAM_EXAMPLE } },
  })
  @ApiCreatedResponse({ description: 'Team assigned to group' })
  assignTeamToGroup(
    @Param('groupId') groupId: string,
    @Body() assignTeamToGroupDto: AssignTeamToGroupDto,
  ) {
    return this.groupsService.assignTeamToGroup(
      groupId,
      assignTeamToGroupDto,
    );
  }

  @Get(':groupId/teams')
  @ApiOperation({ summary: 'Get teams assigned to a group' })
  @ApiParam({ name: 'groupId', description: 'Group MongoId' })
  @ApiResponse({ status: 200, description: 'List of group teams' })
  getGroupTeams(@Param('groupId') groupId: string) {
    return this.groupsService.getGroupTeams(groupId);
  }

  @Delete(':groupId/teams/:teamId')
  @ApiOperation({ summary: 'Remove a team from a group' })
  @ApiParam({ name: 'groupId', description: 'Group MongoId' })
  @ApiParam({ name: 'teamId', description: 'Team MongoId' })
  removeTeamFromGroup(
    @Param('groupId') groupId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.groupsService.removeTeamFromGroup(groupId, teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group by id' })
  @ApiParam({ name: 'id', description: 'Group MongoId' })
  @ApiOkResponse({ type: GroupResponseDto })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a group' })
  @ApiParam({ name: 'id', description: 'Group MongoId' })
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiParam({ name: 'id', description: 'Group MongoId' })
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}

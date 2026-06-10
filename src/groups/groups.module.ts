import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './schemas/group.schema';
import { GroupTeam, GroupTeamSchema } from './schemas/group-team.schema';
import { Tournament, TournamentSchema } from 'src/tournaments/schemas/tournament.schema';
import { Team, TeamSchema } from 'src/teams/schemas/team.schema';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupTeam.name, schema: GroupTeamSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [MongooseModule, GroupsService],
})
export class GroupsModule {}

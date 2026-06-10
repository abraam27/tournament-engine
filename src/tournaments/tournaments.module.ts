import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import { Team, TeamSchema } from 'src/teams/schemas/team.schema';
import { Group, GroupSchema } from 'src/groups/schemas/group.schema';
import { GroupTeam, GroupTeamSchema } from 'src/groups/schemas/group-team.schema';
import { GroupsModule } from 'src/groups/groups.module';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentsSeedService } from './tournaments-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Group.name, schema: GroupSchema },
      { name: GroupTeam.name, schema: GroupTeamSchema },
    ]),
    GroupsModule,
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentsSeedService],
  exports: [MongooseModule, TournamentsService],
})
export class TournamentsModule {}

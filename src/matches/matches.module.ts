import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/match.schema';
import { Tournament, TournamentSchema } from 'src/tournaments/schemas/tournament.schema';
import { Group, GroupSchema } from 'src/groups/schemas/group.schema';
import { GroupTeam, GroupTeamSchema } from 'src/groups/schemas/group-team.schema';
import { Team, TeamSchema } from 'src/teams/schemas/team.schema';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { FixtureGeneratorService } from './fixture-generator.service';
import { KnockoutsModule } from 'src/knockouts/knockouts.module';

@Module({
  imports: [
    KnockoutsModule,
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Group.name, schema: GroupSchema },
      { name: GroupTeam.name, schema: GroupTeamSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
  ],
  controllers: [MatchesController],
  providers: [MatchesService, FixtureGeneratorService],
  exports: [MongooseModule, MatchesService, FixtureGeneratorService],
})
export class MatchesModule {}

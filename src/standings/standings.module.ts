import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from 'src/groups/schemas/group.schema';
import { GroupTeam, GroupTeamSchema } from 'src/groups/schemas/group-team.schema';
import { Match, MatchSchema } from 'src/matches/schemas/match.schema';
import { Tournament, TournamentSchema } from 'src/tournaments/schemas/tournament.schema';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupTeam.name, schema: GroupTeamSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Tournament.name, schema: TournamentSchema },
    ]),
  ],
  controllers: [StandingsController],
  providers: [StandingsService],
  exports: [StandingsService],
})
export class StandingsModule {}

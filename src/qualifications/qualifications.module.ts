import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from 'src/matches/schemas/match.schema';
import { Tournament, TournamentSchema } from 'src/tournaments/schemas/tournament.schema';
import { Group, GroupSchema } from 'src/groups/schemas/group.schema';
import { StandingsModule } from 'src/standings/standings.module';
import { QualificationsController } from './qualifications.controller';
import { QualificationsService } from './qualifications.service';

@Module({
  imports: [
    StandingsModule,
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [QualificationsController],
  providers: [QualificationsService],
  exports: [QualificationsService],
})
export class QualificationsModule {}

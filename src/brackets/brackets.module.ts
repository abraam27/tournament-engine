import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from 'src/matches/schemas/match.schema';
import { Tournament, TournamentSchema } from 'src/tournaments/schemas/tournament.schema';
import { Group, GroupSchema } from 'src/groups/schemas/group.schema';
import { Stage, StageSchema } from 'src/stages/stage.schema';
import {
  BracketSlot,
  BracketSlotSchema,
} from 'src/bracket-slots/bracket-slot.schema';
import { StandingsModule } from 'src/standings/standings.module';
import { KnockoutsModule } from 'src/knockouts/knockouts.module';
import { BracketsController } from './brackets.controller';
import { BracketsService } from './brackets.service';

@Module({
  imports: [
    StandingsModule,
    KnockoutsModule,
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Stage.name, schema: StageSchema },
      { name: BracketSlot.name, schema: BracketSlotSchema },
    ]),
  ],
  controllers: [BracketsController],
  providers: [BracketsService],
  exports: [BracketsService],
})
export class BracketsModule {}

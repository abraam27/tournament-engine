import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from 'src/matches/schemas/match.schema';
import { Tournament, TournamentSchema } from 'src/tournaments/schemas/tournament.schema';
import { Stage, StageSchema } from 'src/stages/stage.schema';
import {
  BracketSlot,
  BracketSlotSchema,
} from 'src/bracket-slots/bracket-slot.schema';
import { KnockoutsController } from './knockouts.controller';
import { KnockoutsService } from './knockouts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Stage.name, schema: StageSchema },
      { name: BracketSlot.name, schema: BracketSlotSchema },
    ]),
  ],
  controllers: [KnockoutsController],
  providers: [KnockoutsService],
  exports: [KnockoutsService],
})
export class KnockoutsModule {}

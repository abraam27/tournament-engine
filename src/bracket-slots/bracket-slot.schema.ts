import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { BracketSlotPosition } from './enums/bracket-slot-position.enum';
import { BracketSourceType } from './enums/bracket-source-type.enum';

@Schema({
  collection: 'bracket_slots',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class BracketSlot extends Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  })
  tournamentId: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage',
  })
  stageId: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  })
  matchId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String, enum: MatchRound })
  round: MatchRound;

  @Prop({ required: true, type: String, enum: BracketSlotPosition })
  slot: BracketSlotPosition;

  @Prop({ required: true, type: String, enum: BracketSourceType })
  sourceType: BracketSourceType;

  @Prop({ required: true, type: String })
  sourceRef: string;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  })
  teamId?: mongoose.Types.ObjectId;
}

export const BracketSlotSchema = SchemaFactory.createForClass(BracketSlot);

BracketSlotSchema.index({ matchId: 1, slot: 1 }, { unique: true });
BracketSlotSchema.index({ tournamentId: 1, round: 1 });
BracketSlotSchema.index({ tournamentId: 1, teamId: 1 });

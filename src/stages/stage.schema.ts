import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { StageType } from './enums/stage-type.enum';
import { StageStatus } from './enums/stage-status.enum';
import { MatchRound } from 'src/matches/enums/match-round.enum';

@Schema({
  collection: 'stages',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Stage extends Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  })
  tournamentId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String, enum: StageType })
  type: StageType;

  @Prop({ required: true, type: String, enum: MatchRound })
  round: MatchRound;

  @Prop({ required: true, type: Number })
  order: number;

  @Prop({
    required: true,
    type: String,
    enum: StageStatus,
    default: StageStatus.PENDING,
  })
  status: StageStatus;
}

export const StageSchema = SchemaFactory.createForClass(Stage);

StageSchema.index({ tournamentId: 1, round: 1 }, { unique: true });
StageSchema.index({ tournamentId: 1, type: 1 });

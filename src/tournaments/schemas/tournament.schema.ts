import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { TournamentStatus } from '../enums/tournament-status.enum';

@Schema({
  collection: 'tournaments',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Tournament extends Document {
  @Prop({ required: true, type: String, trim: true })
  name: string;

  @Prop({ required: true, type: Number })
  year: number;

  @Prop({
    required: true,
    type: String,
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  @Prop({ required: true, type: Number, default: 48 })
  teamsCount: number;

  @Prop({ required: true, type: Number, default: 12 })
  groupsCount: number;

  @Prop({ required: true, type: Number, default: 4 })
  teamsPerGroup: number;

  @Prop({ required: true, type: Number, default: 2 })
  qualifiedPerGroup: number;

  @Prop({ required: true, type: Number, default: 8 })
  bestThirdCount: number;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage',
  })
  currentStageId?: mongoose.Types.ObjectId;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);

TournamentSchema.index({ name: 1, year: 1 }, { unique: true });

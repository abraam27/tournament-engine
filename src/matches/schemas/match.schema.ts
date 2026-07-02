import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { MatchStatus } from '../enums/match-status.enum';
import { MatchRound } from '../enums/match-round.enum';
import { NextMatchSlot } from '../enums/next-match-slot.enum';

@Schema({
  collection: 'matches',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Match extends Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  })
  tournamentId: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage',
  })
  stageId?: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
  })
  groupId?: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String, enum: MatchRound })
  round: MatchRound;

  @Prop({ required: true, type: Number })
  matchNumber: number;

  @Prop({ required: false, type: Number, min: 1 })
  bracketPosition?: number;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  })
  homeTeamId: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  })
  awayTeamId: mongoose.Types.ObjectId;

  @Prop({ required: false, type: Number, min: 0 })
  homeScore?: number;

  @Prop({ required: false, type: Number, min: 0 })
  awayScore?: number;

  @Prop({ required: false, type: Boolean, default: false })
  hasExtraTime?: boolean;

  @Prop({ required: false, type: Number, min: 0 })
  extraTimeHomeScore?: number;

  @Prop({ required: false, type: Number, min: 0 })
  extraTimeAwayScore?: number;

  @Prop({ required: false, type: Boolean, default: false })
  hasPenalties?: boolean;

  @Prop({ required: false, type: Number, min: 0 })
  penaltiesHomeScore?: number;

  @Prop({ required: false, type: Number, min: 0 })
  penaltiesAwayScore?: number;

  @Prop({
    required: true,
    type: String,
    enum: MatchStatus,
    default: MatchStatus.SCHEDULED,
  })
  status: MatchStatus;

  @Prop({ required: false, type: Date })
  matchDate?: Date;

  @Prop({ required: false, type: String })
  stadium?: string;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  })
  winnerTeamId?: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  })
  loserTeamId?: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  })
  nextMatchId?: mongoose.Types.ObjectId;

  @Prop({ required: false, type: String, enum: NextMatchSlot })
  nextMatchSlot?: NextMatchSlot;
}

export const MatchSchema = SchemaFactory.createForClass(Match);

MatchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });
MatchSchema.index(
  { groupId: 1, homeTeamId: 1, awayTeamId: 1 },
  { unique: true, sparse: true },
);
MatchSchema.index({ tournamentId: 1, round: 1 });
MatchSchema.index(
  { tournamentId: 1, round: 1, bracketPosition: 1 },
  { unique: true, sparse: true },
);
MatchSchema.index({ groupId: 1 });

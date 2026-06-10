import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { GroupStatus } from '../enums/group-status.enum';

@Schema({
  collection: 'groups',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Group extends Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Tournament.name,
  })
  tournamentId: Tournament;

  @Prop({ required: true, type: String, trim: true })
  name: string;

  @Prop({ required: true, type: String, trim: true })
  code: string;

  @Prop({
    required: true,
    type: String,
    enum: GroupStatus,
    default: GroupStatus.PENDING,
  })
  status: GroupStatus;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.index({ tournamentId: 1, code: 1 }, { unique: true });

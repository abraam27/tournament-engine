import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Confederation } from '../enums/confederation.enum';

@Schema({
  collection: 'teams',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Team extends Document {
  @Prop({ required: true, type: String, trim: true })
  name: string;

  @Prop({ required: true, type: String, uppercase: true, trim: true })
  code: string;

  @Prop({ required: false, type: String })
  flagUrl?: string;

  @Prop({ required: false, type: String, enum: Confederation })
  confederation?: Confederation;

  @Prop({ required: false, type: Number })
  fifaRanking?: number;

  @Prop({ required: false, type: String })
  status?: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);

TeamSchema.index({ code: 1 }, { unique: true });

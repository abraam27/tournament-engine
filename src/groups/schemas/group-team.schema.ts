import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { Group } from './group.schema';
import { Team } from 'src/teams/schemas/team.schema';

@Schema({
  collection: 'group_teams',
  versionKey: false,
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class GroupTeam extends Document {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Tournament.name,
  })
  tournamentId: Tournament;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Group.name,
  })
  groupId: Group;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Team.name,
  })
  teamId: Team;

  @Prop({ required: false, type: Number })
  seed?: number;
}

export const GroupTeamSchema = SchemaFactory.createForClass(GroupTeam);

GroupTeamSchema.index({ groupId: 1, teamId: 1 }, { unique: true });
GroupTeamSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

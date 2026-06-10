import { BracketSourceType } from 'src/bracket-slots/enums/bracket-source-type.enum';
import { BracketSlotPosition } from 'src/bracket-slots/enums/bracket-slot-position.enum';

export interface ResolvedBracketSlot {
  slot: BracketSlotPosition;
  sourceType: BracketSourceType;
  sourceRef: string;
  teamId: string;
}

export interface ResolvedBracketMatch {
  homeSourceRef: string;
  awaySourceRef: string;
  homeTeamId: string;
  awayTeamId: string;
  slots: ResolvedBracketSlot[];
}

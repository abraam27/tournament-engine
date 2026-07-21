import { MatchRound } from 'src/matches/enums/match-round.enum';
import { RoundTemplate } from './knockout-template.interface';
import { ROUND_OF_16_TEMPLATE } from './round-of-16.template';
import { QUARTER_FINAL_TEMPLATE } from './quarter-final.template';
import { SEMI_FINAL_TEMPLATE } from './semi-final.template';
import { THIRD_PLACE_TEMPLATE } from './third-place.template';
import { FINAL_TEMPLATE } from './final.template';

export const SCAFFOLD_ROUND_TEMPLATES: RoundTemplate[] = [
  { round: MatchRound.ROUND_16, matches: ROUND_OF_16_TEMPLATE },
  { round: MatchRound.QUARTER_FINAL, matches: QUARTER_FINAL_TEMPLATE },
  { round: MatchRound.SEMI_FINAL, matches: SEMI_FINAL_TEMPLATE },
  { round: MatchRound.THIRD_PLACE, matches: THIRD_PLACE_TEMPLATE },
  { round: MatchRound.FINAL, matches: FINAL_TEMPLATE },
];

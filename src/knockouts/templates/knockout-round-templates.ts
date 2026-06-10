import { MatchRound } from 'src/matches/enums/match-round.enum';
import { RoundTemplate } from './knockout-template.interface';
import { ROUND_OF_16_TEMPLATE } from './round-of-16.template';
import { QUARTER_FINAL_TEMPLATE } from './quarter-final.template';
import { SEMI_FINAL_TEMPLATE } from './semi-final.template';
import { THIRD_PLACE_TEMPLATE } from './third-place.template';
import { FINAL_TEMPLATE } from './final.template';

export const KNOCKOUT_ROUND_TEMPLATES: Partial<
  Record<MatchRound, RoundTemplate[]>
> = {
  [MatchRound.ROUND_32]: [
    { round: MatchRound.ROUND_16, matches: ROUND_OF_16_TEMPLATE },
  ],
  [MatchRound.ROUND_16]: [
    { round: MatchRound.QUARTER_FINAL, matches: QUARTER_FINAL_TEMPLATE },
  ],
  [MatchRound.QUARTER_FINAL]: [
    { round: MatchRound.SEMI_FINAL, matches: SEMI_FINAL_TEMPLATE },
  ],
  [MatchRound.SEMI_FINAL]: [
    { round: MatchRound.THIRD_PLACE, matches: THIRD_PLACE_TEMPLATE },
    { round: MatchRound.FINAL, matches: FINAL_TEMPLATE },
  ],
};

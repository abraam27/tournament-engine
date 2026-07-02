import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Match } from 'src/matches/schemas/match.schema';
import { Tournament } from 'src/tournaments/schemas/tournament.schema';
import { Stage } from 'src/stages/stage.schema';
import { BracketSlot } from 'src/bracket-slots/bracket-slot.schema';
import { SubmitMatchResultDto } from 'src/matches/dto/submit-match-result.dto';
import { MatchRound } from 'src/matches/enums/match-round.enum';
import { MatchStatus } from 'src/matches/enums/match-status.enum';
import { isBracketPositionRound } from 'src/matches/constants/bracket-position-rounds.constant';
import { StageType } from 'src/stages/enums/stage-type.enum';
import { StageStatus } from 'src/stages/enums/stage-status.enum';
import { BracketSlotPosition } from 'src/bracket-slots/enums/bracket-slot-position.enum';
import { BracketSourceType } from 'src/bracket-slots/enums/bracket-source-type.enum';
import { assertValidObjectId } from 'src/common/utils/mongoose.util';
import { buildFlagCdnUrl } from 'src/teams/utils/flag-url.util';
import { KNOCKOUT_ROUND_TEMPLATES } from './templates/knockout-round-templates';
import {
  KnockoutTemplateMatch,
  RoundTemplate,
} from './templates/knockout-template.interface';
import {
  ResolvedSourceRef,
  ResolvedTemplateMatch,
} from './interfaces/resolved-template-match.interface';

const KNOCKOUT_ROUNDS = [
  MatchRound.ROUND_32,
  MatchRound.ROUND_16,
  MatchRound.QUARTER_FINAL,
  MatchRound.SEMI_FINAL,
  MatchRound.THIRD_PLACE,
  MatchRound.FINAL,
];

const EXPECTED_MATCH_COUNTS: Partial<Record<MatchRound, number>> = {
  [MatchRound.ROUND_32]: 16,
  [MatchRound.ROUND_16]: 8,
  [MatchRound.QUARTER_FINAL]: 4,
  [MatchRound.SEMI_FINAL]: 2,
};

const STAGE_CONFIG: Partial<
  Record<MatchRound, { name: string; order: number }>
> = {
  [MatchRound.ROUND_16]: { name: 'Round of 16', order: 3 },
  [MatchRound.QUARTER_FINAL]: { name: 'Quarter Finals', order: 4 },
  [MatchRound.SEMI_FINAL]: { name: 'Semi Finals', order: 5 },
  [MatchRound.THIRD_PLACE]: { name: 'Third Place', order: 6 },
  [MatchRound.FINAL]: { name: 'Final', order: 7 },
};

export interface KnockoutWinnerResult {
  winnerTeamId: mongoose.Types.ObjectId;
  loserTeamId: mongoose.Types.ObjectId;
  hasExtraTime: boolean;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  hasPenalties: boolean;
  penaltiesHomeScore?: number;
  penaltiesAwayScore?: number;
}

@Injectable()
export class KnockoutsService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
    @InjectModel(Stage.name) private readonly stageModel: Model<Stage>,
    @InjectModel(BracketSlot.name)
    private readonly bracketSlotModel: Model<BracketSlot>,
  ) {}

  determineGroupWinner(
    match: Match,
    dto: SubmitMatchResultDto,
  ): {
    winnerTeamId?: mongoose.Types.ObjectId;
    loserTeamId?: mongoose.Types.ObjectId;
  } {
    if (dto.hasExtraTime || dto.hasPenalties) {
      throw new BadRequestException(
        'Extra time and penalties are not allowed for group matches',
      );
    }

    if (
      dto.extraTimeHomeScore !== undefined ||
      dto.extraTimeAwayScore !== undefined ||
      dto.penaltiesHomeScore !== undefined ||
      dto.penaltiesAwayScore !== undefined
    ) {
      throw new BadRequestException(
        'Extra time and penalty scores are not allowed for group matches',
      );
    }

    const { homeScore, awayScore } = dto;

    if (homeScore > awayScore) {
      return {
        winnerTeamId: match.homeTeamId,
        loserTeamId: match.awayTeamId,
      };
    }

    if (awayScore > homeScore) {
      return {
        winnerTeamId: match.awayTeamId,
        loserTeamId: match.homeTeamId,
      };
    }

    return {};
  }

  determineKnockoutWinner(
    match: Match,
    dto: SubmitMatchResultDto,
  ): KnockoutWinnerResult {
    const { homeScore, awayScore } = dto;
    const hasExtraTime = dto.hasExtraTime === true;
    const hasPenalties = dto.hasPenalties === true;

    if (homeScore !== awayScore) {
      this.assertNoExtraTimeOrPenaltiesForDecidedMatch(dto);

      return {
        winnerTeamId:
          homeScore > awayScore ? match.homeTeamId : match.awayTeamId,
        loserTeamId:
          homeScore > awayScore ? match.awayTeamId : match.homeTeamId,
        hasExtraTime: false,
        hasPenalties: false,
      };
    }

    if (!hasExtraTime) {
      throw new BadRequestException(
        'Knockout matches drawn after full time require extra time',
      );
    }

    if (
      dto.extraTimeHomeScore === undefined ||
      dto.extraTimeAwayScore === undefined
    ) {
      throw new BadRequestException(
        'extraTimeHomeScore and extraTimeAwayScore are required when hasExtraTime is true',
      );
    }

    if (dto.extraTimeHomeScore < homeScore) {
      throw new BadRequestException(
        'extraTimeHomeScore must be greater than or equal to homeScore',
      );
    }

    if (dto.extraTimeAwayScore < awayScore) {
      throw new BadRequestException(
        'extraTimeAwayScore must be greater than or equal to awayScore',
      );
    }

    if (dto.extraTimeHomeScore !== dto.extraTimeAwayScore) {
      if (hasPenalties) {
        throw new BadRequestException(
          'Penalties are not allowed when extra time produces a winner',
        );
      }

      if (
        dto.penaltiesHomeScore !== undefined ||
        dto.penaltiesAwayScore !== undefined
      ) {
        throw new BadRequestException(
          'Penalty scores must not be provided when extra time produces a winner',
        );
      }

      return {
        winnerTeamId:
          dto.extraTimeHomeScore > dto.extraTimeAwayScore
            ? match.homeTeamId
            : match.awayTeamId,
        loserTeamId:
          dto.extraTimeHomeScore > dto.extraTimeAwayScore
            ? match.awayTeamId
            : match.homeTeamId,
        hasExtraTime: true,
        extraTimeHomeScore: dto.extraTimeHomeScore,
        extraTimeAwayScore: dto.extraTimeAwayScore,
        hasPenalties: false,
      };
    }

    if (!hasPenalties) {
      throw new BadRequestException(
        'Knockout matches drawn after extra time require penalties',
      );
    }

    if (
      dto.penaltiesHomeScore === undefined ||
      dto.penaltiesAwayScore === undefined
    ) {
      throw new BadRequestException(
        'penaltiesHomeScore and penaltiesAwayScore are required when hasPenalties is true',
      );
    }

    if (dto.penaltiesHomeScore === dto.penaltiesAwayScore) {
      throw new BadRequestException('Penalty shootout scores cannot be equal');
    }

    return {
      winnerTeamId:
        dto.penaltiesHomeScore > dto.penaltiesAwayScore
          ? match.homeTeamId
          : match.awayTeamId,
      loserTeamId:
        dto.penaltiesHomeScore > dto.penaltiesAwayScore
          ? match.awayTeamId
          : match.homeTeamId,
      hasExtraTime: true,
      extraTimeHomeScore: dto.extraTimeHomeScore,
      extraTimeAwayScore: dto.extraTimeAwayScore,
      hasPenalties: true,
      penaltiesHomeScore: dto.penaltiesHomeScore,
      penaltiesAwayScore: dto.penaltiesAwayScore,
    };
  }

  async generateNextRound(tournamentId: string, currentRound: MatchRound) {
    assertValidObjectId(tournamentId, 'tournamentId');

    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }

    this.assertGeneratableRound(currentRound);

    await this.validateCurrentRoundCompleted(tournamentId, currentRound);

    const roundTemplates = this.getRoundTemplates(currentRound);
    const nextRounds = roundTemplates.map((template) => template.round);

    const createdMatches: Match[] = [];
    for (const roundTemplate of roundTemplates) {
      const matches = await this.generateRoundFromTemplate(
        tournamentId,
        roundTemplate.round,
        roundTemplate.matches,
      );
      createdMatches.push(...matches);
    }

    return {
      tournamentId,
      currentRound,
      nextRounds,
      createdMatchesCount: createdMatches.length,
      matches: createdMatches,
    };
  }

  async generateRoundFromTemplate(
    tournamentId: string,
    targetRound: MatchRound,
    template: KnockoutTemplateMatch[],
  ): Promise<Match[]> {
    await this.assertTargetRoundDoesNotExist(tournamentId, targetRound);

    const matchByNumber = await this.buildMatchByNumberMap(tournamentId);
    this.validateTemplateSourceMatches(template, matchByNumber);

    const resolvedMatches = template.map((templateMatch, index) =>
      this.resolveTemplateMatch(
        templateMatch,
        targetRound,
        matchByNumber,
        index + 1,
      ),
    );

    return this.createNextRoundMatches(tournamentId, resolvedMatches);
  }

  async getKnockoutBracket(tournamentId: string) {
    assertValidObjectId(tournamentId, 'tournamentId');

    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }

    const matches = await this.matchModel
      .find({
        tournamentId,
        round: { $in: KNOCKOUT_ROUNDS },
      })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .exec();

    const rounds = KNOCKOUT_ROUNDS.reduce(
      (acc, round) => {
        acc[round] = [];
        return acc;
      },
      {} as Record<string, ReturnType<KnockoutsService['mapKnockoutMatch']>[]>,
    );

    for (const match of matches) {
      rounds[match.round].push(this.mapKnockoutMatch(match));
    }

    for (const round of KNOCKOUT_ROUNDS) {
      rounds[round] = this.sortBracketRoundMatches(rounds[round], round);
    }

    return {
      tournamentId,
      rounds,
    };
  }

  async getRound(tournamentId: string, round: string) {
    assertValidObjectId(tournamentId, 'tournamentId');
    this.assertValidKnockoutRound(round);

    const tournament = await this.tournamentModel.findById(tournamentId).exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${tournamentId}" not found`,
      );
    }

    const matches = await this.matchModel
      .find({ tournamentId, round })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .exec();

    return {
      tournamentId,
      round,
      matches: this.sortBracketRoundMatches(
        matches.map((match) => this.mapKnockoutMatch(match)),
        round as MatchRound,
      ),
    };
  }

  getRoundTemplates(currentRound: MatchRound): RoundTemplate[] {
    const templates = KNOCKOUT_ROUND_TEMPLATES[currentRound];

    if (!templates || templates.length === 0) {
      throw new BadRequestException(
        `Round "${currentRound}" does not have a configured template`,
      );
    }

    return templates;
  }

  getNextRound(currentRound: MatchRound): MatchRound[] {
    return this.getRoundTemplates(currentRound).map((template) => template.round);
  }

  resolveSourceRef(
    sourceRef: string,
    matchByNumber: Map<number, Match>,
  ): ResolvedSourceRef {
    const winnerMatch = sourceRef.match(/^WINNER_MATCH_(\d+)$/);
    if (winnerMatch) {
      const matchNumber = Number(winnerMatch[1]);
      const match = this.getCompletedSourceMatch(sourceRef, matchNumber, matchByNumber);

      if (!match.winnerTeamId) {
        throw new BadRequestException(
          `Winner is not determined for source match "${sourceRef}"`,
        );
      }

      return {
        teamId: match.winnerTeamId.toString(),
        sourceType: BracketSourceType.MATCH_WINNER,
        sourceRef,
      };
    }

    const loserMatch = sourceRef.match(/^LOSER_MATCH_(\d+)$/);
    if (loserMatch) {
      const matchNumber = Number(loserMatch[1]);
      const match = this.getCompletedSourceMatch(sourceRef, matchNumber, matchByNumber);

      if (!match.loserTeamId) {
        throw new BadRequestException(
          `Loser is not determined for source match "${sourceRef}"`,
        );
      }

      return {
        teamId: match.loserTeamId.toString(),
        sourceType: BracketSourceType.MATCH_LOSER,
        sourceRef,
      };
    }

    throw new BadRequestException(`Invalid source ref "${sourceRef}"`);
  }

  validateTemplateSourceMatches(
    template: KnockoutTemplateMatch[],
    matchByNumber: Map<number, Match>,
  ): void {
    for (const templateMatch of template) {
      this.resolveSourceRef(templateMatch.homeSource, matchByNumber);
      this.resolveSourceRef(templateMatch.awaySource, matchByNumber);
    }
  }

  resolveRoundTemplate(
    roundTemplate: RoundTemplate,
    matchByNumber: Map<number, Match>,
  ): ResolvedTemplateMatch[] {
    return roundTemplate.matches.map((templateMatch, index) =>
      this.resolveTemplateMatch(
        templateMatch,
        roundTemplate.round,
        matchByNumber,
        index + 1,
      ),
    );
  }

  resolveTemplateMatch(
    templateMatch: KnockoutTemplateMatch,
    round: MatchRound,
    matchByNumber: Map<number, Match>,
    bracketPosition: number,
  ): ResolvedTemplateMatch {
    const home = this.resolveSourceRef(templateMatch.homeSource, matchByNumber);
    const away = this.resolveSourceRef(templateMatch.awaySource, matchByNumber);

    return {
      round,
      matchNumber: templateMatch.matchNumber,
      bracketPosition,
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeSourceRef: home.sourceRef,
      awaySourceRef: away.sourceRef,
      homeSourceType: home.sourceType,
      awaySourceType: away.sourceType,
      matchDate: templateMatch.matchDate
        ? new Date(templateMatch.matchDate)
        : undefined,
      stadium: templateMatch.stadium,
    };
  }

  async validateCurrentRoundCompleted(
    tournamentId: string,
    currentRound: MatchRound,
  ): Promise<Match[]> {
    const expectedCount = EXPECTED_MATCH_COUNTS[currentRound];
    if (!expectedCount) {
      throw new BadRequestException(
        `Round "${currentRound}" cannot generate a next round`,
      );
    }

    const matches = await this.matchModel
      .find({ tournamentId, round: currentRound })
      .sort({ matchNumber: 1 })
      .exec();

    if (matches.length !== expectedCount) {
      throw new BadRequestException(
        `Round "${currentRound}" must have exactly ${expectedCount} matches`,
      );
    }

    const incompleteMatches = matches.filter(
      (match) => match.status !== MatchStatus.COMPLETED,
    );

    if (incompleteMatches.length > 0) {
      throw new BadRequestException(
        `All matches in "${currentRound}" must be completed before generating the next round`,
      );
    }

    const matchesWithoutWinner = matches.filter(
      (match) => !match.winnerTeamId,
    );

    if (matchesWithoutWinner.length > 0) {
      throw new BadRequestException(
        `All completed matches in "${currentRound}" must have a winner before generating the next round`,
      );
    }

    if (currentRound === MatchRound.SEMI_FINAL) {
      const matchesWithoutLoser = matches.filter((match) => !match.loserTeamId);
      if (matchesWithoutLoser.length > 0) {
        throw new BadRequestException(
          'All completed semi-final matches must have a loser before generating the final and third-place match',
        );
      }
    }

    return matches;
  }

  private async buildMatchByNumberMap(
    tournamentId: string,
  ): Promise<Map<number, Match>> {
    const matches = await this.matchModel.find({ tournamentId }).exec();
    return new Map(matches.map((match) => [match.matchNumber, match]));
  }

  private async createNextRoundMatches(
    tournamentId: string,
    resolvedMatches: ResolvedTemplateMatch[],
  ) {
    const createdMatches: Match[] = [];
    const stageCache = new Map<MatchRound, Stage>();

    for (const resolvedMatch of resolvedMatches) {
      let stage = stageCache.get(resolvedMatch.round);

      if (!stage) {
        stage =
          (await this.stageModel
            .findOne({ tournamentId, round: resolvedMatch.round })
            .exec()) ?? undefined;

        if (!stage) {
          const stageConfig = STAGE_CONFIG[resolvedMatch.round];
          stage = await this.stageModel.create({
            tournamentId,
            name: stageConfig?.name ?? resolvedMatch.round,
            type: StageType.KNOCKOUT,
            round: resolvedMatch.round,
            order: stageConfig?.order ?? 0,
            status: StageStatus.PENDING,
          });
        }

        stageCache.set(resolvedMatch.round, stage);
      }

      const match = await this.matchModel.create({
        tournamentId,
        stageId: stage._id,
        round: resolvedMatch.round,
        matchNumber: resolvedMatch.matchNumber,
        bracketPosition: isBracketPositionRound(resolvedMatch.round)
          ? resolvedMatch.bracketPosition
          : undefined,
        homeTeamId: resolvedMatch.homeTeamId,
        awayTeamId: resolvedMatch.awayTeamId,
        status: MatchStatus.SCHEDULED,
        matchDate: resolvedMatch.matchDate,
        stadium: resolvedMatch.stadium,
      });

      await this.bracketSlotModel.insertMany([
        {
          tournamentId,
          stageId: stage._id,
          matchId: match._id,
          round: resolvedMatch.round,
          slot: BracketSlotPosition.HOME,
          sourceType: resolvedMatch.homeSourceType,
          sourceRef: resolvedMatch.homeSourceRef,
          teamId: resolvedMatch.homeTeamId,
        },
        {
          tournamentId,
          stageId: stage._id,
          matchId: match._id,
          round: resolvedMatch.round,
          slot: BracketSlotPosition.AWAY,
          sourceType: resolvedMatch.awaySourceType,
          sourceRef: resolvedMatch.awaySourceRef,
          teamId: resolvedMatch.awayTeamId,
        },
      ]);

      const populatedMatch = await this.matchModel
        .findById(match._id)
        .populate('homeTeamId')
        .populate('awayTeamId')
        .exec();

      if (populatedMatch) {
        createdMatches.push(populatedMatch);
      }
    }

    return createdMatches;
  }

  private getCompletedSourceMatch(
    sourceRef: string,
    matchNumber: number,
    matchByNumber: Map<number, Match>,
  ): Match {
    const match = matchByNumber.get(matchNumber);

    if (!match) {
      throw new BadRequestException(
        `Source match "${sourceRef}" does not exist`,
      );
    }

    if (match.status !== MatchStatus.COMPLETED) {
      throw new BadRequestException(
        `Source match "${sourceRef}" is not completed`,
      );
    }

    return match;
  }

  private async assertTargetRoundDoesNotExist(
    tournamentId: string,
    targetRound: MatchRound,
  ): Promise<void> {
    const existingCount = await this.matchModel
      .countDocuments({ tournamentId, round: targetRound })
      .exec();

    if (existingCount > 0) {
      throw new ConflictException(
        `Matches for round "${targetRound}" already exist for this tournament`,
      );
    }
  }

  private assertGeneratableRound(currentRound: MatchRound): void {
    if (
      ![
        MatchRound.ROUND_32,
        MatchRound.ROUND_16,
        MatchRound.QUARTER_FINAL,
        MatchRound.SEMI_FINAL,
      ].includes(currentRound)
    ) {
      throw new BadRequestException(
        'currentRound must be one of: round_32, round_16, quarter_final, semi_final',
      );
    }
  }

  private assertValidKnockoutRound(round: string): asserts round is MatchRound {
    if (!KNOCKOUT_ROUNDS.includes(round as MatchRound)) {
      throw new BadRequestException(
        `round must be one of: ${KNOCKOUT_ROUNDS.join(', ')}`,
      );
    }
  }

  private assertNoExtraTimeOrPenaltiesForDecidedMatch(
    dto: SubmitMatchResultDto,
  ): void {
    if (dto.hasExtraTime || dto.hasPenalties) {
      throw new BadRequestException(
        'Extra time and penalties must not be used when full-time score has a winner',
      );
    }

    if (
      dto.extraTimeHomeScore !== undefined ||
      dto.extraTimeAwayScore !== undefined ||
      dto.penaltiesHomeScore !== undefined ||
      dto.penaltiesAwayScore !== undefined
    ) {
      throw new BadRequestException(
        'Extra time and penalty scores must not be provided when full-time score has a winner',
      );
    }
  }

  private sortBracketRoundMatches<
    T extends { bracketPosition?: number; matchNumber: number },
  >(matches: T[], round: MatchRound): T[] {
    if (!isBracketPositionRound(round)) {
      return [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
    }

    return [...matches].sort((a, b) => {
      const positionA = a.bracketPosition ?? Number.MAX_SAFE_INTEGER;
      const positionB = b.bracketPosition ?? Number.MAX_SAFE_INTEGER;

      if (positionA !== positionB) {
        return positionA - positionB;
      }

      return a.matchNumber - b.matchNumber;
    });
  }

  private mapKnockoutMatch(match: Match) {
    return {
      matchId: match._id.toString(),
      matchNumber: match.matchNumber,
      bracketPosition: match.bracketPosition,
      round: match.round,
      homeTeam: this.mapPopulatedTeam(match.homeTeamId),
      awayTeam: this.mapPopulatedTeam(match.awayTeamId),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      hasExtraTime: match.hasExtraTime ?? false,
      extraTimeHomeScore: match.extraTimeHomeScore,
      extraTimeAwayScore: match.extraTimeAwayScore,
      hasPenalties: match.hasPenalties ?? false,
      penaltiesHomeScore: match.penaltiesHomeScore,
      penaltiesAwayScore: match.penaltiesAwayScore,
      winnerTeamId: match.winnerTeamId?.toString(),
      loserTeamId: match.loserTeamId?.toString(),
      status: match.status,
      matchDate: match.matchDate?.toISOString(),
    };
  }

  private mapPopulatedTeam(team: unknown) {
    if (!team || typeof team !== 'object') {
      return null;
    }

    const populatedTeam = team as {
      _id?: { toString(): string };
      name?: string;
      code?: string;
      flagUrl?: string;
    };

    return {
      _id: populatedTeam._id?.toString(),
      name: populatedTeam.name,
      code: populatedTeam.code,
      ...(populatedTeam.flagUrl
        ? { flagUrl: buildFlagCdnUrl(populatedTeam.flagUrl) }
        : {}),
    };
  }
}

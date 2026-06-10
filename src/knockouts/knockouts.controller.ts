import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GENERATE_NEXT_ROUND_EXAMPLE } from 'src/common/swagger/swagger-body.examples';
import { KnockoutBracketResponseDto } from 'src/common/swagger/swagger-response.dto';

import { KnockoutsService } from './knockouts.service';
import { GenerateNextRoundDto } from './dto/generate-next-round.dto';

@Controller('knockouts')
@ApiTags('Knockouts')
export class KnockoutsController {
  constructor(private readonly knockoutsService: KnockoutsService) {}

  @Post('tournaments/:tournamentId/generate-next-round')
  @ApiOperation({ summary: 'Generate the next knockout round from completed matches' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiBody({
    type: GenerateNextRoundDto,
    examples: {
      roundOf16: {
        summary: 'Generate Round of 16',
        value: GENERATE_NEXT_ROUND_EXAMPLE,
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Next round matches created from template source refs',
  })
  generateNextRound(
    @Param('tournamentId') tournamentId: string,
    @Body() generateNextRoundDto: GenerateNextRoundDto,
  ) {
    return this.knockoutsService.generateNextRound(
      tournamentId,
      generateNextRoundDto.currentRound,
    );
  }

  @Get('tournaments/:tournamentId/bracket')
  @ApiOperation({ summary: 'Get all knockout matches grouped by round' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiOkResponse({
    type: KnockoutBracketResponseDto,
    description: 'Knockout bracket grouped by round',
  })
  getKnockoutBracket(@Param('tournamentId') tournamentId: string) {
    return this.knockoutsService.getKnockoutBracket(tournamentId);
  }

  @Get('tournaments/:tournamentId/rounds/:round')
  @ApiOperation({ summary: 'Get knockout matches for a single round' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiParam({
    name: 'round',
    description:
      'Knockout round (round_32, round_16, quarter_final, semi_final, third_place, final)',
  })
  @ApiResponse({
    status: 200,
    description: 'Knockout matches for the requested round',
  })
  getRound(
    @Param('tournamentId') tournamentId: string,
    @Param('round') round: string,
  ) {
    return this.knockoutsService.getRound(tournamentId, round);
  }
}

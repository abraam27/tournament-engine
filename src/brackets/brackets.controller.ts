import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BracketMatchResponseDto } from 'src/common/swagger/swagger-response.dto';
import { BracketsService } from './brackets.service';

@Controller('brackets')
@ApiTags('Brackets')

export class BracketsController {
  constructor(private readonly bracketsService: BracketsService) {}

  @Post('tournaments/:tournamentId/round-of-32')
  @ApiOperation({ summary: 'Generate Round of 32 knockout bracket' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiCreatedResponse({
    type: BracketMatchResponseDto,
    isArray: true,
    description: 'Round of 32 bracket generated with 16 matches',
  })
  generateRoundOf32(@Param('tournamentId') tournamentId: string) {
    return this.bracketsService.generateRoundOf32(tournamentId);
  }

  @Get('tournaments/:tournamentId/rounds/:round')
  @ApiOperation({ summary: 'Get bracket by tournament and round' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiParam({
    name: 'round',
    description:
      'Knockout round (round_32, round_16, quarter_final, semi_final, third_place, final)',
  })
  @ApiOkResponse({
    type: BracketMatchResponseDto,
    isArray: true,
    description: 'Bracket matches with slot metadata',
  })
  getBracket(
    @Param('tournamentId') tournamentId: string,
    @Param('round') round: string,
  ) {
    return this.bracketsService.getBracket(tournamentId, round);
  }

  @Get('tournaments/:tournamentId/qualified-teams')
  @ApiOperation({ summary: 'Get qualified teams map without creating matches' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiResponse({
    status: 200,
    description: 'Qualified teams keyed by source ref (A1, BEST_THIRD_1, etc.)',
  })
  getQualifiedTeams(@Param('tournamentId') tournamentId: string) {
    return this.bracketsService.getQualifiedTeams(tournamentId);
  }
}

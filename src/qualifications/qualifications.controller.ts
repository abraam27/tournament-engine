import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  QualifiedTeamsResponseDto,
  ThirdPlaceRankingResponseDto,
} from 'src/common/swagger/swagger-response.dto';
import { QualificationsService } from './qualifications.service';

@Controller('qualifications')
@ApiTags('Qualifications')
export class QualificationsController {
  constructor(private readonly qualificationsService: QualificationsService) {}

  @Get('tournaments/:tournamentId/qualified-teams')
  @ApiOperation({ summary: 'Get qualified teams for a tournament' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiOkResponse({
    type: QualifiedTeamsResponseDto,
    description:
      'Qualified teams including automatic group qualifiers and best third-place teams',
  })
  getQualifiedTeams(@Param('tournamentId') tournamentId: string) {
    return this.qualificationsService.getQualifiedTeams(tournamentId);
  }

  @Get('tournaments/:tournamentId/third-place-ranking')
  @ApiOperation({ summary: 'Get third-place teams ranking across all groups' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiOkResponse({
    type: ThirdPlaceRankingResponseDto,
    description:
      'All third-place teams ranked with qualification flag for top 8',
  })
  getThirdPlaceRanking(@Param('tournamentId') tournamentId: string) {
    return this.qualificationsService.getThirdPlaceRanking(tournamentId);
  }

  @Get('tournaments/:tournamentId/group-winners')
  @ApiOperation({
    summary: 'Get top 2 qualified teams from each group (A1, A2, B1, B2, etc.)',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament MongoId' })
  @ApiResponse({
    status: 200,
    description: 'Automatic group qualifiers (rank 1 and 2 from each group)',
  })
  getGroupWinners(@Param('tournamentId') tournamentId: string) {
    return this.qualificationsService.getGroupWinners(tournamentId);
  }
}

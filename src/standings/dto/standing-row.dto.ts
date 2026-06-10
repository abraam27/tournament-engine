import { ApiProperty } from '@nestjs/swagger';

export class StandingTeamDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  _id: string;

  @ApiProperty({ example: 'Egypt' })
  name: string;

  @ApiProperty({ example: 'EGY' })
  code: string;
}

export class StandingRowDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d3' })
  teamId: string;

  @ApiProperty({ type: StandingTeamDto })
  team: StandingTeamDto;

  @ApiProperty({ example: 3 })
  played: number;

  @ApiProperty({ example: 2 })
  won: number;

  @ApiProperty({ example: 1 })
  drawn: number;

  @ApiProperty({ example: 0 })
  lost: number;

  @ApiProperty({ example: 5 })
  goalsFor: number;

  @ApiProperty({ example: 2 })
  goalsAgainst: number;

  @ApiProperty({ example: 3 })
  goalDifference: number;

  @ApiProperty({ example: 7 })
  points: number;

  @ApiProperty({ example: 1 })
  rank: number;
}

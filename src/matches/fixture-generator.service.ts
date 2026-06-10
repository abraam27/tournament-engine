import { BadRequestException, Injectable } from '@nestjs/common';

export interface FixturePair {
  homeTeamId: string;
  awayTeamId: string;
}

@Injectable()
export class FixtureGeneratorService {
  generateRoundRobinFixtures(teamIds: string[]): FixturePair[] {
    if (teamIds.length < 2) {
      throw new BadRequestException(
        'At least 2 teams are required to generate fixtures',
      );
    }

    const fixtures: FixturePair[] = [];

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        fixtures.push({
          homeTeamId: teamIds[i],
          awayTeamId: teamIds[j],
        });
      }
    }

    return fixtures;
  }
}

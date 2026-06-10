import { BadRequestException } from '@nestjs/common';
import { FixtureGeneratorService } from './fixture-generator.service';

describe('FixtureGeneratorService', () => {
  let service: FixtureGeneratorService;

  beforeEach(() => {
    service = new FixtureGeneratorService();
  });

  const pairKey = (home: string, away: string) =>
    [home, away].sort().join('-');

  const getPairKeys = (fixtures: { homeTeamId: string; awayTeamId: string }[]) =>
    fixtures.map((fixture) => pairKey(fixture.homeTeamId, fixture.awayTeamId));

  it('generates 6 matches for 4 teams', () => {
    const fixtures = service.generateRoundRobinFixtures([
      'T1',
      'T2',
      'T3',
      'T4',
    ]);
    expect(fixtures).toHaveLength(6);
  });

  it('does not generate reversed duplicate pairs', () => {
    const fixtures = service.generateRoundRobinFixtures([
      'T1',
      'T2',
      'T3',
      'T4',
    ]);

    fixtures.forEach((fixture) => {
      const reversed = fixtures.find(
        (candidate) =>
          candidate.homeTeamId === fixture.awayTeamId &&
          candidate.awayTeamId === fixture.homeTeamId,
      );
      expect(reversed).toBeUndefined();
    });
  });

  it('does not generate duplicate pairs', () => {
    const fixtures = service.generateRoundRobinFixtures([
      'T1',
      'T2',
      'T3',
      'T4',
    ]);
    const pairKeys = getPairKeys(fixtures);
    expect(new Set(pairKeys).size).toBe(pairKeys.length);
  });

  it('does not allow a team to play itself', () => {
    const fixtures = service.generateRoundRobinFixtures([
      'T1',
      'T2',
      'T3',
      'T4',
    ]);
    fixtures.forEach((fixture) => {
      expect(fixture.homeTeamId).not.toBe(fixture.awayTeamId);
    });
  });

  it('generates 3 matches for 3 teams', () => {
    const fixtures = service.generateRoundRobinFixtures(['T1', 'T2', 'T3']);
    expect(fixtures).toHaveLength(3);
  });

  it('generates 1 match for 2 teams', () => {
    const fixtures = service.generateRoundRobinFixtures(['T1', 'T2']);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toEqual({ homeTeamId: 'T1', awayTeamId: 'T2' });
  });

  it('throws BadRequestException for fewer than 2 teams', () => {
    expect(() => service.generateRoundRobinFixtures(['T1'])).toThrow(
      BadRequestException,
    );
    expect(() => service.generateRoundRobinFixtures([])).toThrow(
      BadRequestException,
    );
  });

  it('generates expected pairs for 4 teams', () => {
    const fixtures = service.generateRoundRobinFixtures([
      'T1',
      'T2',
      'T3',
      'T4',
    ]);
    const expectedPairs = [
      'T1-T2',
      'T1-T3',
      'T1-T4',
      'T2-T3',
      'T2-T4',
      'T3-T4',
    ];
    const pairKeys = getPairKeys(fixtures).sort();
    expect(pairKeys).toEqual(expectedPairs.sort());
  });
});

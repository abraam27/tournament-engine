import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import appConfig from '../src/config/app.config';
import databaseConfig from '../src/config/database.config';
import environmentValidation from '../src/config/enviroment.validation';
import { TournamentsModule } from '../src/tournaments/tournaments.module';
import { TeamsModule } from '../src/teams/teams.module';
import { GroupsModule } from '../src/groups/groups.module';
import { MatchesModule } from '../src/matches/matches.module';
import { StandingsModule } from '../src/standings/standings.module';
import { BracketsModule } from '../src/brackets/brackets.module';
import { QualificationsModule } from '../src/qualifications/qualifications.module';
import { KnockoutsModule } from '../src/knockouts/knockouts.module';

const ENV = process.env.NODE_ENV ?? 'test';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${ENV}`],
      load: [appConfig, databaseConfig],
      validationSchema: environmentValidation,
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongoDB.mongoUri'),
      }),
      inject: [ConfigService],
    }),
    TournamentsModule,
    TeamsModule,
    GroupsModule,
    MatchesModule,
    StandingsModule,
    BracketsModule,
    QualificationsModule,
    KnockoutsModule,
  ],
})
export class TournamentTestModule {}

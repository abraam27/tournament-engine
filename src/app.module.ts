import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import environmentValidation from './config/enviroment.validation';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';
import { GroupsModule } from './groups/groups.module';
import { MatchesModule } from './matches/matches.module';
import { StandingsModule } from './standings/standings.module';
import { BracketsModule } from './brackets/brackets.module';
import { QualificationsModule } from './qualifications/qualifications.module';
import { KnockoutsModule } from './knockouts/knockouts.module';

const ENV = process.env.NODE_ENV ?? 'development';
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
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
})
export class AppModule {}

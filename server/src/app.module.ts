import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { AppResolver } from './app.resolver';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UploadModule } from './upload/upload.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { RequestsModule } from './requests/requests.module';
import { LocationsModule } from './locations/locations.module';
import { WeatherModule } from './weather/weather.module';
import { BmkgLogsModule } from './bmkg-logs/bmkg-logs.module';
import { DangerZonesModule } from './danger-zones/danger-zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('REDIS_URI')!);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10),
            username: url.username || undefined,
            password: decodeURIComponent(url.password) || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    MongoloquentModule.forRoot({
      connection: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      database: process.env.DB_NAME ?? 'resq-db',
      timezone: 'Asia/Jakarta',
      global: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      subscriptions: {
        'graphql-ws': true,
      },
      formatError: (error) => {
        const originalError = error.extensions?.originalError as
          | { message: string | string[] }
          | undefined;

        return {
          message: Array.isArray(originalError?.message)
            ? originalError.message[0]
            : (originalError?.message ?? error.message),
          extensions: {
            code: error.extensions?.code,
          },
        };
      },
    }),
    UsersModule,
    AuthModule,
    CloudinaryModule,
    UploadModule,
    RequestsModule,
    LocationsModule,
    ActivityLogsModule,
    WeatherModule,
    BmkgLogsModule,
    DangerZonesModule,
  ],
  providers: [AppResolver],
})
export class AppModule {}

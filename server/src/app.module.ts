import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { AppResolver } from './app.resolver';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    RequestsModule,
  ],
  providers: [AppResolver],
})
export class AppModule {}

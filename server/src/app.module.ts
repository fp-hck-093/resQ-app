import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { AppResolver } from './app.resolver';

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
      subscriptions: {
        'graphql-ws': true,
      },
    }),
  ],
  providers: [AppResolver],
})
export class AppModule {}

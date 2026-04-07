import { Module } from '@nestjs/common';
import depthLimit from 'graphql-depth-limit';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityModule } from './activity/activity.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';
import { SeedModule } from './seed/seed.module';
import { UserModule } from './user/user.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { PayloadDto } from './auth/types/jwtPayload.dto';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [JwtModule],
      inject: [JwtService, ConfigService],
      useFactory: async (
        jwtService: JwtService,
        configService: ConfigService,
      ) => {
        const secret = configService.get<string>('JWT_SECRET');
        return {
          autoSchemaFile: 'schema.gql',
          sortSchema: true,
          playground: process.env.NODE_ENV !== 'production',
          introspection: process.env.NODE_ENV !== 'production',
          buildSchemaOptions: { numberScalarMode: 'integer' },
          validationRules: [depthLimit(5)],
          context: async ({ req, res }: { req: Request; res: Response }) => {
            const token =
              req.headers.jwt ?? (req.cookies && req.cookies['jwt']);

            let jwtPayload: PayloadDto | null = null;
            if (token) {
              try {
                jwtPayload = (await jwtService.verifyAsync(token, {
                  secret,
                  algorithms: ['HS256'],
                })) as PayloadDto;
              } catch {
                // Expired or tampered token — treat as unauthenticated.
                // AuthGuard will reject protected resolvers.
                jwtPayload = null;
              }
            }

            return {
              jwtPayload,
              req,
              res,
            };
          },
        };
      },
    }),
    AuthModule,
    UserModule,
    MeModule,
    ActivityModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class BaseAppModule {}

@Module({
  imports: [
    BaseAppModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
    }),
  ],
})
export class AppModule {}

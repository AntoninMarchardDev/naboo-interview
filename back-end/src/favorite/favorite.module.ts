import { Module } from '@nestjs/common';
import { FavoriteResolver } from './favorite.resolver';
import { FavoriteService } from './favorite.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Favorite, FavoriteSchema } from './favorite.schema';
import { Activity, ActivitySchema } from 'src/activity/activity.schema';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    AuthModule,
  ],
  providers: [FavoriteResolver, FavoriteService],
})
export class FavoriteModule {}

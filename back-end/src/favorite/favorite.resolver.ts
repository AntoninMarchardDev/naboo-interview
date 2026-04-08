import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Favorite } from './favorite.schema';
import { FavoriteService } from './favorite.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ContextWithJWTPayload } from 'src/auth/types/context';
import {
  AddToFavoriteInput,
  RemoveFromFavoriteInput,
} from './types/favorite.input';

@Resolver(() => Favorite)
export class FavoriteResolver {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Query(() => [Favorite], { name: 'getFavorites' })
  @UseGuards(AuthGuard)
  async getFavorites(
    @Context() context: ContextWithJWTPayload,
  ): Promise<Favorite[]> {
    return this.favoriteService.findByUser(context.jwtPayload.id);
  }

  @Mutation(() => Favorite)
  @UseGuards(AuthGuard)
  async addFavorite(
    @Context() context: ContextWithJWTPayload,
    @Args('addToFavoriteInput') addToFavoriteInput: AddToFavoriteInput,
  ): Promise<Favorite> {
    return this.favoriteService.add(
      context.jwtPayload.id,
      addToFavoriteInput.activityId,
    );
  }

  @Mutation(() => Favorite)
  @UseGuards(AuthGuard)
  async removeFavorite(
    @Context() context: ContextWithJWTPayload,
    @Args('removeFromFavoriteInput')
    removeFromFavoriteInput: RemoveFromFavoriteInput,
  ): Promise<Favorite> {
    return this.favoriteService.remove(
      context.jwtPayload.id,
      removeFromFavoriteInput.activityId,
    );
  }
}

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsArray, IsInt, IsNotEmpty, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class AddToFavoriteInput {
  @Field()
  @IsNotEmpty()
  activityId!: string;
}

@InputType()
export class RemoveFromFavoriteInput extends AddToFavoriteInput {}

@InputType()
export class FavoriteOrderItemInput {
  @Field()
  @IsNotEmpty()
  id!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  order!: number;
}

@InputType()
export class ReorderFavoritesInput {
  @Field(() => [FavoriteOrderItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FavoriteOrderItemInput)
  favorites!: FavoriteOrderItemInput[];
}

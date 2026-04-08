import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class AddToFavoriteInput {
  @Field()
  @IsNotEmpty()
  activityId!: string;
}

@InputType()
export class RemoveFromFavoriteInput extends AddToFavoriteInput {}

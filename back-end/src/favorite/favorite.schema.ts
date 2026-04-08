import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { User } from 'src/user/user.schema';
import { Activity } from 'src/activity/activity.schema';

@ObjectType()
@Schema({ timestamps: true })
export class Favorite extends Document {
  @Field(() => ID)
  id!: string;

  @Field(() => User)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: User;

  @Field(() => Activity)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true,
  })
  activity!: Activity;

  @Field(() => Int)
  @Prop({ required: true, default: 0 })
  order!: number;

  @Field(() => Date, { nullable: true })
  createdAt!: Date;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

FavoriteSchema.index({ user: 1, activity: 1 }, { unique: true });

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite } from './favorite.schema';
import { Model } from 'mongoose';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name)
    private favoriteModel: Model<Favorite>,
  ) {}

  async findByUser(userId: string): Promise<Favorite[]> {
    return this.favoriteModel
      .find({ user: userId })
      .populate({ path: 'activity' })
      .exec();
  }

  async add(userId: string, activityId: string): Promise<Favorite> {
    const existing = await this.favoriteModel
      .findOne({ user: userId, activity: activityId })
      .exec();

    if (existing) {
      throw new ConflictException('Activity already in favorites');
    }

    return this.favoriteModel.create({ user: userId, activity: activityId });
  }

  async remove(userId: string, activityId: string): Promise<Favorite> {
    const favorite = await this.favoriteModel
      .findOneAndDelete({ user: userId, activity: activityId })
      .populate('activity')
      .exec();

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return favorite;
  }
}

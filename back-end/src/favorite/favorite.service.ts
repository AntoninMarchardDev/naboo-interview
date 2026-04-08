import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Favorite } from './favorite.schema';
import { Model } from 'mongoose';
import { FavoriteOrderItemInput } from './types/favorite.input';

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
      .sort({ order: 1 })
      .exec();
  }

  async add(userId: string, activityId: string): Promise<Favorite> {
    const existing = await this.favoriteModel
      .findOne({ user: userId, activity: activityId })
      .exec();

    if (existing) {
      throw new ConflictException('Activity already in favorites');
    }

    const count = await this.favoriteModel.countDocuments({ user: userId });
    return this.favoriteModel.create({
      user: userId,
      activity: activityId,
      order: count,
    });
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

  async reorder(
    userId: string,
    items: FavoriteOrderItemInput[],
  ): Promise<Favorite[]> {
    await Promise.all(
      items.map(({ id, order }) =>
        this.favoriteModel
          .updateOne({ _id: id, user: userId }, { order })
          .exec(),
      ),
    );
    return this.findByUser(userId);
  }
}

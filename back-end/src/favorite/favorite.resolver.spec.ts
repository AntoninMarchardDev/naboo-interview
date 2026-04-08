import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FavoriteResolver } from './favorite.resolver';
import { FavoriteService } from './favorite.service';
import { Favorite } from './favorite.schema';
import { ContextWithJWTPayload } from 'src/auth/types/context';
import { Types } from 'mongoose';

const buildContext = (userId: string): ContextWithJWTPayload =>
  ({
    jwtPayload: { id: userId, email: 'user@test.com' },
  }) as ContextWithJWTPayload;

const buildFavorite = (userId: string, activityId: string): Favorite =>
  ({
    id: new Types.ObjectId().toHexString(),
    user: userId,
    activity: activityId,
    order: 0,
    createdAt: new Date(),
  }) as unknown as Favorite;

describe('FavoriteResolver', () => {
  let resolver: FavoriteResolver;
  let favoriteService: jest.Mocked<FavoriteService>;

  beforeEach(async () => {
    const mockFavoriteService: jest.Mocked<FavoriteService> = {
      findByUser: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<FavoriteService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteResolver,
        { provide: FavoriteService, useValue: mockFavoriteService },
      ],
    }).compile();

    resolver = module.get<FavoriteResolver>(FavoriteResolver);
    favoriteService = module.get(FavoriteService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getFavorites', () => {
    it('returns the favorites for the authenticated user', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();
      const favorites = [buildFavorite(userId, activityId)];

      favoriteService.findByUser.mockResolvedValue(favorites);

      const result = await resolver.getFavorites(buildContext(userId));

      expect(favoriteService.findByUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(favorites);
    });

    it('returns an empty array when the user has no favorites', async () => {
      const userId = new Types.ObjectId().toHexString();
      favoriteService.findByUser.mockResolvedValue([]);

      const result = await resolver.getFavorites(buildContext(userId));

      expect(result).toEqual([]);
    });
  });

  describe('addFavorite', () => {
    it('calls service.add with the correct user and activity ids', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();
      const favorite = buildFavorite(userId, activityId);

      favoriteService.add.mockResolvedValue(favorite);

      const result = await resolver.addFavorite(buildContext(userId), {
        activityId,
      });

      expect(favoriteService.add).toHaveBeenCalledWith(userId, activityId);
      expect(result).toBe(favorite);
    });

    it('propagates ConflictException when the activity is already a favorite', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      favoriteService.add.mockRejectedValue(
        new ConflictException('Activity already in favorites'),
      );

      await expect(
        resolver.addFavorite(buildContext(userId), { activityId }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeFavorite', () => {
    it('calls service.remove with the correct user and activity ids', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();
      const favorite = buildFavorite(userId, activityId);

      favoriteService.remove.mockResolvedValue(favorite);

      const result = await resolver.removeFavorite(buildContext(userId), {
        activityId,
      });

      expect(favoriteService.remove).toHaveBeenCalledWith(userId, activityId);
      expect(result).toBe(favorite);
    });

    it('propagates NotFoundException when the favorite does not exist', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      favoriteService.remove.mockRejectedValue(
        new NotFoundException('Favorite not found'),
      );

      await expect(
        resolver.removeFavorite(buildContext(userId), { activityId }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

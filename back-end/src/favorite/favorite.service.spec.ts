import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FavoriteService } from './favorite.service';
import { FavoriteModule } from './favorite.module';
import { TestModule, closeInMongodConnection } from 'src/test/test.module';

describe('FavoriteService', () => {
  let service: FavoriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestModule, FavoriteModule],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  afterAll(async () => {
    await closeInMongodConnection();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUser', () => {
    it('returns an empty array when the user has no favorites', async () => {
      const userId = new Types.ObjectId().toHexString();
      const result = await service.findByUser(userId);
      expect(result).toEqual([]);
    });

    it('returns the favorites belonging to the given user', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await service.add(userId, activityId);
      const result = await service.findByUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].user.toString()).toBe(userId);
    });

    it('does not return favorites belonging to another user', async () => {
      const userId = new Types.ObjectId().toHexString();
      const otherUserId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await service.add(otherUserId, activityId);
      const result = await service.findByUser(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('add', () => {
    it('creates and returns a new favorite', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      const favorite = await service.add(userId, activityId);

      expect(favorite).toBeDefined();
      expect(favorite.user.toString()).toBe(userId);
      expect(favorite.activity.toString()).toBe(activityId);
    });

    it('throws ConflictException when the same activity is already favorited by the user', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await service.add(userId, activityId);

      await expect(service.add(userId, activityId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('allows the same activity to be favorited by different users', async () => {
      const userId1 = new Types.ObjectId().toHexString();
      const userId2 = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await expect(service.add(userId1, activityId)).resolves.toBeDefined();
      await expect(service.add(userId2, activityId)).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('deletes and returns the removed favorite', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await service.add(userId, activityId);
      const removed = await service.remove(userId, activityId);

      expect(removed).toBeDefined();
      expect(removed.user.toString()).toBe(userId);
    });

    it('removes the favorite from the user list after deletion', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await service.add(userId, activityId);
      await service.remove(userId, activityId);

      const remaining = await service.findByUser(userId);
      expect(remaining).toHaveLength(0);
    });

    it('throws NotFoundException when the favorite does not exist', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId = new Types.ObjectId().toHexString();

      await expect(service.remove(userId, activityId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('only removes the targeted favorite, leaving others intact', async () => {
      const userId = new Types.ObjectId().toHexString();
      const activityId1 = new Types.ObjectId().toHexString();
      const activityId2 = new Types.ObjectId().toHexString();

      await service.add(userId, activityId1);
      await service.add(userId, activityId2);
      await service.remove(userId, activityId1);

      const remaining = await service.findByUser(userId);
      expect(remaining).toHaveLength(1);
    });
  });
});

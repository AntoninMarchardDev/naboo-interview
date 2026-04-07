import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SeedService } from './seed/seed.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private seedService: SeedService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      Logger.log('Seeding skipped in production.');
      return;
    }
    await this.seedService.execute();
  }
}

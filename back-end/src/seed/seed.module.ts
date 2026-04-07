import { Module } from '@nestjs/common';
import { ActivityModule } from 'src/activity/activity.module';
import { UserModule } from 'src/user/user.module';
import { SeedService } from './seed.service';

@Module({
  imports: [UserModule, ActivityModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}

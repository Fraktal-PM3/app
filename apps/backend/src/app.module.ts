import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisService } from 'redis/redis.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [HealthController],
  providers: [PrismaService, RedisService],
})
export class AppModule {}

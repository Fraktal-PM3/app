import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // try to connect on startup
    await this.ping();
  }

  async onModuleDestroy() {
    await this.quit();
  }
}

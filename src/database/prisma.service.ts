import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly config: ConfigService) {
    super();
  }

  async onModuleInit() {
    this.config.getOrThrow<string>('DATABASE_URL');
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';
import { EmailQueueModule } from './email/email.queue.module';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheCleanupService } from "./cache/cache-cleanup.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL') ?? '';

        return {
          store: await redisStore({
            url: url,
            socket: {
              tls: url?.startsWith('rediss://') ? true : false,
              rejectUnauthorized: false,
            },
            pingInterval: 5 * 1000,
          }),
        };
      },
    }),
    PrismaModule,
    TasksModule,
    ProjectsModule,
    UsersModule,
    EmailQueueModule,
  ],
  providers: [CacheCleanupService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { EmailQueueModule } from '../email/email.queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}

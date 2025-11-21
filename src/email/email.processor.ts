import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from './email.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'taskAssignment') {
      const { assigneeEmail, taskTitle } = job.data as { assigneeEmail: string; taskTitle: string };
      await this.emailService.sendTaskAssignmentNotification(assigneeEmail, taskTitle);
      return;
    }
  }
}



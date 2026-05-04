import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RequestsService } from './requests.service';
import { CreateRequestInput } from './dto/create-request.input';
import { URGENCY_QUEUE, SCORE_URGENCY_JOB } from './requests.constants';

@Processor(URGENCY_QUEUE)
export class UrgencyScoringProcessor extends WorkerHost {
  constructor(private readonly requestsService: RequestsService) {
    super();
  }

  async process(
    job: Job<{ requestId: string; input: CreateRequestInput }>,
  ): Promise<void> {
    if (job.name !== SCORE_URGENCY_JOB) return;
    const { requestId, input } = job.data;
    await this.requestsService.applyUrgencyScore(requestId, input);
  }
}

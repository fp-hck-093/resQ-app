import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ObjectId } from 'mongodb';
import { ActivityLog, ActivityLogStatus } from './models/activity-log.model';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog) private activityLogModel: typeof ActivityLog,
  ) {}

  async create(volunteerId: string, requestId: string): Promise<ActivityLog> {
    const result = await this.activityLogModel.create({
      volunteerId: new ObjectId(volunteerId),
      requestId: new ObjectId(requestId),
      status: ActivityLogStatus.ACTIVE,
    });
    return result as unknown as ActivityLog;
  }

  async updateStatus(
    volunteerId: string,
    requestId: string,
    status: ActivityLogStatus,
  ): Promise<ActivityLog> {
    const vId = new ObjectId(volunteerId);
    const rId = new ObjectId(requestId);

    const exists = await this.activityLogModel
      .where('volunteerId', vId)
      .where('requestId', rId)
      .first();

    if (!exists) {
      throw new NotFoundException('Activity log not found');
    }

    const currentStatus = exists.status;

    if (currentStatus === ActivityLogStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot change status of a completed activity',
      );
    }

    if (currentStatus === ActivityLogStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot change status of a cancelled activity',
      );
    }

    await this.activityLogModel
      .where('volunteerId', vId)
      .where('requestId', rId)
      .update({ status });

    const updated = await this.activityLogModel
      .where('volunteerId', vId)
      .where('requestId', rId)
      .first();

    return updated as unknown as ActivityLog;
  }

  async findByVolunteer(volunteerId: string): Promise<ActivityLog[]> {
    const result = await this.activityLogModel
      .where('volunteerId', new ObjectId(volunteerId))
      .get();
    return result as unknown as ActivityLog[];
  }

  async updateStatusByRequest(
    requestId: string,
    status: ActivityLogStatus,
  ): Promise<void> {
    await this.activityLogModel
      .where('requestId', new ObjectId(requestId))
      .update({ status });
  }

  async findByRequest(requestId: string): Promise<ActivityLog[]> {
    const result = await this.activityLogModel
      .where('requestId', new ObjectId(requestId))
      .get();
    return result as unknown as ActivityLog[];
  }
}

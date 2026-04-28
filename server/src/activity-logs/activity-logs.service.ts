import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ObjectId } from 'mongodb';
import { ActivityLog, ActivityLogStatus } from './models/activity-log.model';
import {
  ActivityLogWithRequest,
  PaginatedActivityLogs,
} from './dto/paginated-activity-logs.output';
import { Request } from '../requests/models/request.model';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog) private activityLogModel: typeof ActivityLog,
    @InjectModel(Request) private requestModel: typeof Request,
  ) {}

  async create(volunteerId: string, requestId: string): Promise<ActivityLog> {
    const vId = new ObjectId(volunteerId);
    const rId = new ObjectId(requestId);
    const existing = await this.activityLogModel
      .where('volunteerId', vId)
      .where('requestId', rId)
      .first();

    if (existing) {
      await this.activityLogModel
        .where('volunteerId', vId)
        .where('requestId', rId)
        .update({ status: ActivityLogStatus.ACTIVE });

      const updated = await this.activityLogModel
        .where('volunteerId', vId)
        .where('requestId', rId)
        .first();

      return updated as unknown as ActivityLog;
    }

    const result = await this.activityLogModel.create({
      volunteerId: vId,
      requestId: rId,
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

    const request = await this.requestModel.find(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status === 'completed') {
      throw new BadRequestException('Request is already completed');
    }

    const currentStatus = exists.status;

    if (currentStatus === ActivityLogStatus.COMPLETED) {
      if (status === ActivityLogStatus.COMPLETED) {
        return exists as unknown as ActivityLog;
      }

      throw new BadRequestException(
        'Cannot change status of a completed activity',
      );
    }

    if (currentStatus === ActivityLogStatus.CANCELLED) {
      if (status === ActivityLogStatus.CANCELLED) {
        return exists as unknown as ActivityLog;
      }

      throw new BadRequestException(
        'Cannot change status of a cancelled activity',
      );
    }

    await this.activityLogModel
      .where('volunteerId', vId)
      .where('requestId', rId)
      .update({ status });

    if (status === ActivityLogStatus.CANCELLED) {
      const volunteerIds: ObjectId[] =
        (request.volunteerIds as unknown as ObjectId[]) ?? [];
      const remainingIds = volunteerIds.filter(
        (id) => id.toString() !== volunteerId,
      );
      const nextStatus = remainingIds.length > 0 ? 'in_progress' : 'pending';

      await request
        .fill({ volunteerIds: remainingIds, status: nextStatus })
        .save();
    }

    const updated = await this.activityLogModel
      .where('volunteerId', vId)
      .where('requestId', rId)
      .first();

    return updated as unknown as ActivityLog;
  }

  async updateStatusByRequest(
    requestId: string,
    status: ActivityLogStatus,
  ): Promise<void> {
    await this.activityLogModel
      .where('requestId', new ObjectId(requestId))
      .update({ status });
  }

  async getMyActivityLogs(
    volunteerId: string,
    page: number,
    limit: number,
    status?: ActivityLogStatus,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedActivityLogs> {
    let query = this.activityLogModel.where(
      'volunteerId',
      new ObjectId(volunteerId),
    );

    if (status) query = query.where('status', status);

    const all = await query.orderBy('createdAt', sortOrder).get();
    const logs = all as unknown as ActivityLog[];

    const total = logs.length;
    const skip = (page - 1) * limit;
    const paginated = logs.slice(skip, skip + limit);

    const requestIds = paginated.map(
      (log) => log.requestId as unknown as ObjectId,
    );

    const requestDocs =
      requestIds.length > 0
        ? await this.requestModel.whereIn('_id', requestIds).get()
        : [];

    const requestMap = new Map(
      (requestDocs as unknown as Request[]).map((r) => [r._id.toString(), r]),
    );

    const data: ActivityLogWithRequest[] = paginated.map((log) => ({
      _id: log._id.toString(),
      volunteerId: (log.volunteerId as unknown as ObjectId).toString(),
      requestId: (log.requestId as unknown as ObjectId).toString(),
      status: log.status,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      request: requestMap.get(
        (log.requestId as unknown as ObjectId).toString(),
      ),
    }));

    return { data, total, page, limit };
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Request } from './models/request.model';
import { CreateRequestInput } from './dto/create-request.input';
import { NEARBY_REQUESTS_RADIUS_KM } from '../common/constants/radius.constants';

@Injectable()
export class RequestsService {
  constructor(@InjectModel(Request) private requestModel: typeof Request) {}

  async createRequest(input: CreateRequestInput): Promise<Request> {
    const validCategories = [
      'Rescue',
      'Shelter',
      'Food',
      'Medical',
      'Money/Item',
    ];
    if (!validCategories.includes(input.category)) {
      throw new BadRequestException(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      );
    }

    const result = await this.requestModel.create({
      userId: input.userId,
      userName: input.userName,
      userPhone: input.userPhone,
      category: input.category,
      description: input.description,
      numberOfPeople: input.numberOfPeople,
      urgencyScore: input.urgencyScore,
      location: input.location,
      address: input.address,
      photos: input.photos || [],
      status: 'pending',
    });

    return result as unknown as Request;
  }

  async getNearbyRequests(
    latitude: number,
    longitude: number,
    status?: string,
    category?: string,
  ): Promise<Request[]> {
    let query = this.requestModel.where('location', {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: NEARBY_REQUESTS_RADIUS_KM * 1000,
      },
    });

    if (status) query = query.where('status', status);
    if (category) query = query.where('category', category);

    const results = await query.get();
    return results as unknown as Request[];
  }

  async getAllRequests(): Promise<Request[]> {
    const results = await this.requestModel.orderBy('createdAt', 'desc').get();
    return results as unknown as Request[];
  }

  async getRequestsByStatus(status: string): Promise<Request[]> {
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const results = await this.requestModel
      .where('status', status)
      .orderBy('createdAt', 'desc')
      .get();
    return results as unknown as Request[];
  }

  async getRequestsByUserId(userId: string): Promise<Request[]> {
    const results = await this.requestModel
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return results as unknown as Request[];
  }

  async getRequestById(id: string): Promise<Request> {
    const result = await this.requestModel.find(id);
    if (!result) {
      throw new NotFoundException('Request not found');
    }
    return result;
  }

  async deleteRequest(id: string): Promise<string> {
    const request = await this.requestModel.find(id);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be deleted');
    }

    await this.requestModel.destroy(id);
    return 'Request has been deleted';
  }

  async volunteerForRequest(
    requestId: string,
    userId: string,
    volunteerId: string
  ): Promise<Request> {
    const request = await this.requestModel.find(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() === userId) {
      throw new BadRequestException(
        'You cannot volunteer for your own request',
      );
    }

    if (request.status === 'completed') {
      throw new BadRequestException('Cannot volunteer for a completed request');
    }

    const currentIds: string[] = (
      (request.volunteerIds as unknown as string[]) ?? []
    ).map(String);

    if (currentIds.includes(volunteerId)) {
      throw new BadRequestException(
        'You have already volunteered for this request',
      );
    }

    const updatedIds = [...currentIds, volunteerId];

    if (request.status === 'pending') {
      await request
        .fill({ status: 'in_progress', volunteerIds: updatedIds })
        .save();
    } else {
      await request.fill({ volunteerIds: updatedIds }).save();
    }

    return request;
  }

  async updateRequestStatus(id: string): Promise<Request> {
    const request = await this.requestModel.find(id);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'in_progress') {
      throw new BadRequestException(
        'Only in-progress requests can be marked as completed',
      );
    }

    await request.fill({ status: 'completed' }).save();
    return request;
  }
}

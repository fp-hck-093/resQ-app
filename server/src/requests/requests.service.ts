import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { Request } from './models/request.model';
import { CreateRequestInput } from './dto/create-request.input';

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

  async deleteRequest(id: string): Promise<boolean> {
    const request = await this.requestModel.find(id);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const result = await this.requestModel.destroy(id);
    return result > 0;
  }

  async updateRequestStatus(
    id: string,
    status: 'pending' | 'in_progress' | 'completed',
  ): Promise<Request> {
    const request = await this.requestModel.find(id);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    await request.fill({ status }).save();
    return request;
  }
}

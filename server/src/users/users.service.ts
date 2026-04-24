import { Injectable } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { User, IUser } from './models/user.model';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.userModel.where('email', email).first();
    return result as unknown as User | null;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.find(id);
  }

  async create(
    data: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const result = await this.userModel.create(data);
    return result as unknown as User;
  }
}

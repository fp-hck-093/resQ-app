import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import * as bcrypt from 'bcryptjs';
import { User, IUser } from './models/user.model';
import { UpdateLocationInput } from './dto/update-location.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ChangePasswordInput } from './dto/change-password.input';

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

  async findAll(): Promise<User[]> {
    const result = await this.userModel.get();
    return result as unknown as User[];
  }

  async create(
    data: Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const result = await this.userModel.create(data);
    return result as unknown as User;
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<string> {
    const user = await this.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(input.currentPassword, user.password);
    if (!isValid) throw new UnauthorizedException('Current password is wrong');

    const hashed = await bcrypt.hash(input.newPassword, 10);
    await this.userModel.where('_id', userId).update({ password: hashed });

    return 'Password changed successfully';
  }

  async updateUser(
    userId: string,
    input: UpdateUserInput,
  ): Promise<User | null> {
    await this.userModel.where('_id', userId).update(input);
    return this.findById(userId);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel
      .where('_id', userId)
      .update({ password: hashedPassword });
  }

  async updateLocation(
    userId: string,
    input: UpdateLocationInput,
  ): Promise<User | null> {
    await this.userModel.where('_id', userId).update({
      currentLocation: {
        type: 'Point',
        coordinates: [input.longitude, input.latitude],
      },
      currentAddress: input.currentAddress ?? undefined,
    });
    return this.findById(userId);
  }
}

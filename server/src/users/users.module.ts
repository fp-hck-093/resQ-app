import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { UsersService } from './users.service';
import { User } from './models/user.model';

@Module({
  imports: [MongoloquentModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

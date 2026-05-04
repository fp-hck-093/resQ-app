import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from '../models/user.model';

@ObjectType()
export class PaginatedUsers {
  @Field(() => [User])
  data: User[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}

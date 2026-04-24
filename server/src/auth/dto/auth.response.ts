import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/models/user.model';

@ObjectType()
export class AuthResponse {
  @Field(() => String)
  token: string;

  @Field(() => User)
  user: User;
}

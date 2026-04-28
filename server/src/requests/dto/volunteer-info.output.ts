import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VolunteerInfo {
  @Field(() => String)
  _id: string;

  @Field(() => String)
  name: string;
}

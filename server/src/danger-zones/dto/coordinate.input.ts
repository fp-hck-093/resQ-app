import { Field, Float, InputType } from '@nestjs/graphql';

@InputType()
export class CoordinateInput {
  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;
}

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GeoPoint {
  @Field(() => String)
  type: string;

  @Field(() => [Float])
  coordinates: number[];
}

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GeoPolygon {
  @Field(() => String)
  type: string;

  @Field(() => [[[[Float]]]])
  coordinates: number[][][][];
}

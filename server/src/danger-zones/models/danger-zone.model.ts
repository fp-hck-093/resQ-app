import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';

export interface IDangerZone {
  _id?: string;
  title: string;
  description: string;
  level: string;
  sourceTypes: string[];
  sourceIds: string[];
  location: { type: string; coordinates: number[] };
  radiusKm: number;
  activeFrom: string;
  activeUntil: string;
  isActive: boolean;
  requestCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class DangerZone extends Model<IDangerZone> {
  public static $schema: IDangerZone;
  protected $collection: string = 'danger_zones';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  level: string;

  @Field(() => [String])
  sourceTypes: string[];

  @Field(() => [String])
  sourceIds: string[];

  @Field(() => GeoPoint)
  location: GeoPoint;

  @Field(() => Float)
  radiusKm: number;

  @Field(() => String)
  activeFrom: string;

  @Field(() => String)
  activeUntil: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  requestCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';

export interface IBmkgAlert {
  _id?: string;
  identifier: string;
  title: string;
  event: string;
  urgency: string;
  severity: string;
  certainty: string;
  areaDesc: string;
  description: string;
  effective: string;
  expires: string;
  location: { type: string; coordinates: number[] };
  alertUrl: string;
  isDangerous: boolean;
  fetchedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class BmkgAlert extends Model<IBmkgAlert> {
  public static $schema: IBmkgAlert;
  protected $collection: string = 'bmkg_alerts';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  identifier: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  event: string;

  @Field(() => String)
  urgency: string;

  @Field(() => String)
  severity: string;

  @Field(() => String)
  certainty: string;

  @Field(() => String)
  areaDesc: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  effective: string;

  @Field(() => String)
  expires: string;

  @Field(() => GeoPoint)
  location: GeoPoint;

  @Field(() => String)
  alertUrl: string;

  @Field(() => Boolean)
  isDangerous: boolean;

  @Field(() => Date)
  fetchedAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

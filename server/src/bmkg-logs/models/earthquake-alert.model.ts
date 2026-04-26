import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';

export interface IEarthquakeAlert {
  _id?: string;
  tanggal: string;
  jam: string;
  location: { type: string; coordinates: number[] };
  magnitude: number;
  kedalaman: string;
  wilayah: string;
  fetchedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class EarthquakeAlert extends Model<IEarthquakeAlert> {
  public static $schema: IEarthquakeAlert;
  protected $collection: string = 'earthquake_alerts';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  tanggal: string;

  @Field(() => String)
  jam: string;

  @Field(() => GeoPoint)
  location: GeoPoint;

  @Field(() => Float)
  magnitude: number;

  @Field(() => String)
  kedalaman: string;

  @Field(() => String)
  wilayah: string;

  @Field(() => Date)
  fetchedAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';

export interface IWeatherAlert {
  headline: string;
  event: string;
  severity: string;
  desc?: string;
}

export interface IWeatherLog {
  _id?: string;
  city: string;
  location: { type: string; coordinates: number[] };
  condition: string;
  conditionCode: number;
  windKph: number;
  precipMm: number;
  humidity: number;
  visibilityKm: number;
  alerts: IWeatherAlert[];
  isDangerous: boolean;
  fetchedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class WeatherAlert {
  @Field(() => String)
  headline: string;

  @Field(() => String)
  event: string;

  @Field(() => String)
  severity: string;

  @Field(() => String, { nullable: true })
  desc?: string;
}

@ObjectType()
export class WeatherLog extends Model<IWeatherLog> {
  public static $schema: IWeatherLog;
  protected $collection: string = 'weather_logs';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  city: string;

  @Field(() => GeoPoint)
  location: GeoPoint;

  @Field(() => String)
  condition: string;

  @Field(() => Int)
  conditionCode: number;

  @Field(() => Float)
  windKph: number;

  @Field(() => Float)
  precipMm: number;

  @Field(() => Int)
  humidity: number;

  @Field(() => Float)
  visibilityKm: number;

  @Field(() => [WeatherAlert])
  alerts: WeatherAlert[];

  @Field(() => Boolean)
  isDangerous: boolean;

  @Field(() => Date)
  fetchedAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

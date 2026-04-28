import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';
import { User } from '../../users/models/user.model';

export interface IUserLocation {
  _id?: string;
  userId: ObjectId;
  location: {
    type: string;
    coordinates: number[];
  };
  address: string;
  city: string;
  province: string;
  country: string;
  notifyOnNewRequests: boolean;
  notifyOnDangerZones: boolean;
  notificationRadius: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class UserLocation extends Model<IUserLocation> {
  public static $schema: IUserLocation;
  protected $collection: string = 'locations';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  userId: string;

  @Field(() => GeoPoint)
  location: GeoPoint;

  @Field(() => String)
  address: string;

  @Field(() => String)
  city: string;

  @Field(() => String)
  province: string;

  @Field(() => String)
  country: string;

  @Field(() => Boolean)
  notifyOnNewRequests: boolean;

  @Field(() => Boolean)
  notifyOnDangerZones: boolean;

  @Field(() => Number)
  notificationRadius: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  user() {
    return this.belongsTo(User, 'userId');
  }
}

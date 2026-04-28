import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';
import { Request } from '../../requests/models/request.model';
import { ActivityLog } from '../../activity-logs/models/activity-log.model';
import { UserLocation } from '../../locations/models/locations.model';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  profilePhoto?: string;
  pushToken?: string;
  currentLocation?: {
    type: string;
    coordinates: number[];
  };
  currentAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class User extends Model<IUser> {
  public static $schema: IUser;
  protected $collection: string = 'users';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  phone: string;

  @HideField()
  password: string;

  @Field(() => String, { nullable: true })
  profilePhoto?: string;

  @Field(() => String, { nullable: true })
  pushToken?: string;

  @Field(() => GeoPoint, { nullable: true })
  currentLocation?: GeoPoint;

  @Field(() => String, { nullable: true })
  currentAddress?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  requests() {
    return this.hasMany(Request, 'userId');
  }

  activityLogs() {
    return this.hasMany(ActivityLog, 'volunteerId');
  }

  locations() {
    return this.hasMany(UserLocation, 'userId');
  }
}

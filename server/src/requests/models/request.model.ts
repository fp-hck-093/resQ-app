import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoloquent';
import { GeoPoint } from '../../common/types/geo-point.type';
import { User } from '../../users/models/user.model';
import { ActivityLog } from '../../activity-logs/models/activity-log.model';

export interface IRequest {
  _id?: string;
  userId: ObjectId;
  userName: string;
  userPhone: string;
  category: 'Rescue' | 'Shelter' | 'Food' | 'Medical' | 'Money/Item';
  description: string;
  numberOfPeople: number;
  urgencyScore: number;
  location: {
    type: string;
    coordinates: number[];
  };
  address: string;
  photos?: string[];
  status: 'pending' | 'in_progress' | 'completed';
  volunteerIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

@ObjectType()
export class Request extends Model<IRequest> {
  public static $schema: IRequest;
  protected $collection: string = 'requests';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  userName: string;

  @Field(() => String)
  userPhone: string;

  @Field(() => String)
  category: string;

  @Field(() => String)
  description: string;

  @Field(() => Number)
  numberOfPeople: number;

  @Field(() => Number)
  urgencyScore: number;

  @Field(() => GeoPoint)
  location: GeoPoint;

  @Field(() => String)
  address: string;

  @Field(() => [String], { nullable: true })
  photos?: string[];

  @Field(() => String)
  status: string;

  @Field(() => [String], { nullable: true })
  volunteerIds?: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  user() {
    return this.belongsTo(User, 'userId');
  }

  activityLogs() {
    return this.hasMany(ActivityLog, 'requestId');
  }
}

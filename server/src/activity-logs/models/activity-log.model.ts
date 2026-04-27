import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoloquent';

export enum ActivityLogStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

registerEnumType(ActivityLogStatus, {
  name: 'ActivityLogStatus',
});

export interface IActivityLog {
  _id?: string;
  volunteerId: ObjectId;
  requestId: ObjectId;
  status: ActivityLogStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

@ObjectType()
export class ActivityLog extends Model<IActivityLog> {
  public static $schema: IActivityLog;
  protected $collection: string = 'activity_logs';

  @Field(() => ID)
  _id: string;

  @Field(() => String)
  volunteerId: string;

  @Field(() => String)
  requestId: string;

  @Field(() => ActivityLogStatus)
  status: ActivityLogStatus;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

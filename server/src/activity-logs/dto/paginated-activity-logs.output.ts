import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ActivityLogStatus } from '../models/activity-log.model';
import { Request } from '../../requests/models/request.model';

@ObjectType()
export class ActivityLogWithRequest {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  volunteerId: string;

  @Field(() => String)
  requestId: string;

  @Field(() => ActivityLogStatus)
  status: ActivityLogStatus;

  @Field(() => Request, { nullable: true })
  request?: Request;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class PaginatedActivityLogs {
  @Field(() => [ActivityLogWithRequest])
  data: ActivityLogWithRequest[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}

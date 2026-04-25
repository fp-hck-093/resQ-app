import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateRequestStatusInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Request ID is required' })
  requestId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Status is required' })
  status: 'pending' | 'in_progress' | 'completed';
}

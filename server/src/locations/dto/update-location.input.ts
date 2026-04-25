import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class UpdateLocationInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Location ID is required' })
  locationId: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  notifyOnNewRequests?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  notifyOnDangerZones?: boolean;
}

import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

@InputType()
export class UpdateLocationInput {
  @Field(() => Float)
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @Field(() => Float)
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  currentAddress?: string;
}

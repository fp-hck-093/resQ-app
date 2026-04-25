import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class LocationInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  type: string;

  @Field(() => [Number])
  @IsNotEmpty()
  coordinates: number[];
}

@InputType()
export class CreateRequestInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'User name is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  userName: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'User phone is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  userPhone: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: 'Rescue' | 'Shelter' | 'Food' | 'Medical' | 'Money/Item';

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  description: string;

  @Field(() => Number)
  @IsNumber()
  @IsNotEmpty({ message: 'Number of people is required' })
  @Min(1, { message: 'Number of people must be at least 1' })
  numberOfPeople: number;

  @Field(() => Number)
  @IsNumber()
  @IsNotEmpty({ message: 'Urgency score is required' })
  @Min(0, { message: 'Urgency score must be at least 0' })
  @Max(10, { message: 'Urgency score must be at most 10' })
  urgencyScore: number;

  @Field(() => LocationInput)
  @IsNotEmpty({ message: 'Location is required' })
  location: LocationInput;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  address: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  photos?: string[];
}

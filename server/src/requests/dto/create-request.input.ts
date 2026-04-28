import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
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
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  userName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  userPhone?: string;

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

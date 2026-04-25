import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class CreateLocationInput {
  @Field(() => [Float])
  @IsArray()
  @IsNotEmpty({ message: 'Coordinates are required' })
  coordinates: number[];

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  address: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  city: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Province is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  province: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  country: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  notifyOnNewRequests?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  notifyOnDangerZones?: boolean;
}

import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @Field(() => String)
  @IsEmail({}, { message: 'Email is invalid' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  phone: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(5, { message: 'Password must be at least 5 characters' })
  @Transform(({ value }: { value: string }) => value.trim())
  password: string;
}

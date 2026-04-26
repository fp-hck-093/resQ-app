import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class ResetPasswordInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'ID is required' })
  id: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Transform(({ value }: { value: string }) => value.trim())
  newPassword: string;
}

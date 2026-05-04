import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  @Transform(({ value }: { value: string }) => value.trim())
  currentPassword: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(5, { message: 'New password must be at least 5 characters' })
  @Transform(({ value }: { value: string }) => value.trim())
  newPassword: string;
}

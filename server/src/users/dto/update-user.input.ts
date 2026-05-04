import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  profilePhoto?: string;
}

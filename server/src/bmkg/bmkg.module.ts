import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { BmkgAlert } from './models/bmkg-alert.model';
import { BmkgService } from './bmkg.service';
import { BmkgResolver } from './bmkg.resolver';

@Module({
  imports: [MongoloquentModule.forFeature([BmkgAlert])],
  providers: [BmkgService, BmkgResolver],
})
export class BmkgModule {}

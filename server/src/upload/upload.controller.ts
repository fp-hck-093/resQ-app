import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('upload')
export class UploadController {
  constructor(private cloudinaryService: CloudinaryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('profile-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPEG, PNG, WEBP allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadProfilePhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const url = await this.cloudinaryService.uploadImage(
      file,
      'resq/profile-photos',
    );
    return { url };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('request-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPEG, PNG, WEBP allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadRequestPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const url = await this.cloudinaryService.uploadImage(
      file,
      'resq/request-photos',
    );
    return { url };
  }
}

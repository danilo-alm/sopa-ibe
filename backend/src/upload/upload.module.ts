import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from './upload.service';

@Module({ imports: [PrismaModule], providers: [UploadService], exports: [UploadService] })
export class UploadModule {}

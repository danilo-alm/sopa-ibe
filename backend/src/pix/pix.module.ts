import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { PixController } from './pix.controller';
import { PixService } from './pix.service';

@Module({
  imports: [ConfiguracaoModule],
  controllers: [PixController],
  providers: [PixService],
})
export class PixModule {}


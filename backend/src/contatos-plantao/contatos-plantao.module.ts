import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContatosPlantaoController } from './contatos-plantao.controller';
import { ContatosPlantaoService } from './contatos-plantao.service';

@Module({
  imports: [AuthModule],
  controllers: [ContatosPlantaoController],
  providers: [ContatosPlantaoService],
})
export class ContatosPlantaoModule {}


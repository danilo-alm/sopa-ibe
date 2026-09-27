import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [AuthModule, UploadModule],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}

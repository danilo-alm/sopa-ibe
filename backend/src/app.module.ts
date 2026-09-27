import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ConfiguracaoModule } from './configuracao/configuracao.module';
import { ContatosPlantaoModule } from './contatos-plantao/contatos-plantao.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PixModule } from './pix/pix.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    ConfiguracaoModule,
    ContatosPlantaoModule,
    PedidosModule,
    PixModule,
  ],
})
export class AppModule {}


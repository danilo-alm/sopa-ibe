import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.configuracao.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    if ((await this.contatoPlantao.count()) === 0) {
      await this.contatoPlantao.create({
        data: { nome: 'Plantão IBE Gerais', numeroWhatsApp: '5531999999999' },
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

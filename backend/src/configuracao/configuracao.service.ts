import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfiguracaoService {
  constructor(private readonly prisma: PrismaService) {}

  obter() {
    return this.prisma.configuracao.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async publica() {
    const config = await this.obter();
    return {
      vendasAbertas: config.vendasAbertas,
      chavePix: config.chavePix,
      valorUnitarioSopa: config.valorUnitarioSopa,
      mensagemFechado: config.mensagemFechado,
    };
  }

  atualizar(data: { vendasAbertas?: boolean; valorUnitarioSopa?: number; mensagemFechado?: string }) {
    return this.prisma.configuracao.update({ where: { id: 1 }, data });
  }
}


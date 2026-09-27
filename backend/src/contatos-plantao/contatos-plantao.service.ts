import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContatosPlantaoService {
  constructor(private readonly prisma: PrismaService) {}

  listarPublicos() {
    return this.prisma.contatoPlantao.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  }

  listar() {
    return this.prisma.contatoPlantao.findMany({ orderBy: { nome: 'asc' } });
  }

  criar(data: { nome: string; numeroWhatsApp: string }) {
    return this.prisma.contatoPlantao.create({
      data: { ...data, numeroWhatsApp: data.numeroWhatsApp.replace(/\D/g, '') },
    });
  }

  atualizar(id: number, data: { nome?: string; numeroWhatsApp?: string; ativo?: boolean }) {
    return this.prisma.contatoPlantao.update({
      where: { id },
      data: { ...data, numeroWhatsApp: data.numeroWhatsApp?.replace(/\D/g, '') },
    });
  }

  remover(id: number) {
    return this.prisma.contatoPlantao.delete({ where: { id } });
  }
}


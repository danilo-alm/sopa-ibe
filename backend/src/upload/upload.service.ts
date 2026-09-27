import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import type { ComprovanteUpload } from '../pedidos/pedidos.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly prisma: PrismaService) {}

  async salvarComprovante(arquivo: ComprovanteUpload) {
    const extensao = this.extensaoSegura(arquivo);
    const nome = `${Date.now()}-${randomUUID()}${extensao}`;
    const diretorio = join(process.cwd(), 'uploads', 'comprovantes');
    await mkdir(diretorio, { recursive: true });
    await writeFile(join(diretorio, nome), arquivo.buffer);
    return `/uploads/comprovantes/${nome}`;
  }

  @Cron(CronExpression.EVERY_WEEK, { name: 'limpeza-comprovantes' })
  async limparComprovantesAntigos() {
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 1);

    const pedidos = await this.prisma.pedido.findMany({
      where: { criadoEm: { lt: limite }, comprovantePath: { not: null } },
      select: { id: true, comprovantePath: true },
    });

    for (const pedido of pedidos) {
      const caminho = this.caminhoComprovante(pedido.comprovantePath);
      if (!caminho) {
        this.logger.warn(`Comprovante do pedido #${pedido.id} ignorado: caminho inválido`);
        continue;
      }

      try {
        await unlink(caminho).catch((erro: NodeJS.ErrnoException) => {
          if (erro.code !== 'ENOENT') throw erro;
        });
        await this.prisma.pedido.updateMany({
          where: { id: pedido.id, comprovantePath: pedido.comprovantePath },
          data: { comprovantePath: null },
        });
      } catch (erro) {
        this.logger.error(`Não foi possível remover o comprovante do pedido #${pedido.id}`, erro);
      }
    }

    if (pedidos.length > 0) {
      this.logger.log(`${pedidos.length} comprovante(s) antigo(s) processado(s)`);
    }
  }

  private caminhoComprovante(comprovantePath: string | null) {
    const prefixo = '/uploads/comprovantes/';
    if (!comprovantePath?.startsWith(prefixo)) return null;

    const nome = comprovantePath.slice(prefixo.length);
    if (!nome || basename(nome) !== nome) return null;

    return join(process.cwd(), 'uploads', 'comprovantes', nome);
  }

  private extensaoSegura(arquivo: ComprovanteUpload) {
    const porMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf',
    };
    const extensao = porMime[arquivo.mimetype];
    const extensaoOriginal = extname(arquivo.originalname).toLowerCase();
    if (!extensao || !['.jpg', '.jpeg', '.png', '.pdf'].includes(extensaoOriginal)) {
      throw new BadRequestException('Formato de comprovante inválido');
    }
    return extensao;
  }
}

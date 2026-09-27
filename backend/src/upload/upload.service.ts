import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import type { ComprovanteUpload } from '../pedidos/pedidos.dto';

@Injectable()
export class UploadService {
  async salvarComprovante(arquivo: ComprovanteUpload) {
    const extensao = this.extensaoSegura(arquivo);
    const nome = `${Date.now()}-${randomUUID()}${extensao}`;
    const diretorio = join(process.cwd(), 'uploads', 'comprovantes');
    await mkdir(diretorio, { recursive: true });
    await writeFile(join(diretorio, nome), arquivo.buffer);
    return `/uploads/comprovantes/${nome}`;
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

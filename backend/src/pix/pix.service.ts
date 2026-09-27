import { Injectable } from '@nestjs/common';
import { ConfiguracaoService } from '../configuracao/configuracao.service';

@Injectable()
export class PixService {
  constructor(private readonly configuracao: ConfiguracaoService) {}

  async gerar(valor: number) {
    const config = await this.configuracao.obter();
    const chave = config.chavePix.replace(/\D/g, '');
    const merchantAccount = this.campo('00', 'br.gov.bcb.pix') + this.campo('01', chave);
    const semCrc =
      this.campo('00', '01') +
      this.campo('26', merchantAccount) +
      this.campo('52', '0000') +
      this.campo('53', '986') +
      this.campo('54', valor.toFixed(2)) +
      this.campo('58', 'BR') +
      this.campo('59', 'IBE GERAIS') +
      this.campo('60', 'BELO HORIZONTE') +
      this.campo('62', this.campo('05', 'SOPAS')) +
      '6304';

    const payload = semCrc + this.crc16(semCrc);
    return { payload, chavePix: config.chavePix, valor: Number(valor.toFixed(2)) };
  }

  private campo(id: string, valor: string) {
    return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
  }

  private crc16(texto: string) {
    let crc = 0xffff;
    for (let i = 0; i < texto.length; i += 1) {
      crc ^= texto.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}


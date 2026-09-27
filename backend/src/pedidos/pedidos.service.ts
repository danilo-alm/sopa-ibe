import { BadRequestException, Injectable, MessageEvent, NotFoundException } from '@nestjs/common';
import { interval, map, merge, Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ComprovanteUpload, CriarPedidoDto, FormaPagamento, StatusPagamento, StatusPedido } from './pedidos.dto';

@Injectable()
export class PedidosService {
  private readonly eventos = new Subject<MessageEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
  ) {}

  async criar(dto: CriarPedidoDto, arquivo?: ComprovanteUpload) {
    const config = await this.prisma.configuracao.findUnique({ where: { id: 1 } });
    if (!config?.vendasAbertas) {
      throw new BadRequestException('As vendas estão fechadas no momento');
    }

    const comprovantePath = arquivo ? await this.upload.salvarComprovante(arquivo) : undefined;

    const pedido = await this.prisma.pedido.create({
      data: {
        ...dto,
        nomeCliente: dto.nomeCliente.trim(),
        telefoneCliente: dto.telefoneCliente.replace(/\D/g, ''),
        enderecoEntrega: dto.enderecoEntrega.trim(),
        pontoReferencia: dto.pontoReferencia?.trim() || null,
        valorTotal: Number((dto.quantidadeSopas * config.valorUnitarioSopa).toFixed(2)),
        comprovantePath,
      },
    });
    this.eventos.next({
      type: 'novo-pedido',
      data: { tipo: 'NOVO_PEDIDO', pedidoId: pedido.id },
    });
    return { id: pedido.id, valorTotal: pedido.valorTotal, statusPedido: pedido.statusPedido };
  }

  acompanharPedidos(): Observable<MessageEvent> {
    const heartbeat = interval(20_000).pipe(
      map(() => ({ type: 'ping', data: { tipo: 'PING' } } as MessageEvent)),
    );
    return merge(this.eventos.asObservable(), heartbeat);
  }

  async listar(status?: StatusPedido, pagina = 1) {
    const porPagina = 10;
    const where = status ? { statusPedido: status } : undefined;
    const [pedidos, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return {
      pedidos,
      paginacao: {
        pagina,
        porPagina,
        total,
        totalPaginas: Math.ceil(total / porPagina),
      },
    };
  }

  async metricas() {
    const pedidos = await this.prisma.pedido.findMany();
    const chaveHoje = this.chaveDoDia(new Date());
    const pedidosDeHoje = pedidos.filter((pedido) => this.chaveDoDia(pedido.criadoEm) === chaveHoje);
    const resumir = (lista: typeof pedidos) => {
      const ativos = lista.filter((pedido) => pedido.statusPedido !== 'CANCELADO');
      const soma = (forma: FormaPagamento) => ativos
        .filter((pedido) => pedido.formaPagamento === forma)
        .reduce((total, pedido) => total + pedido.valorTotal, 0);
      return {
        totalSopas: ativos.reduce((total, pedido) => total + pedido.quantidadeSopas, 0),
        faturamentoTotal: ativos.reduce((total, pedido) => total + pedido.valorTotal, 0),
        faturamentoPix: soma('PIX'),
        faturamentoDinheiro: soma('DINHEIRO'),
        pedidosPendentes: lista.filter((p) => p.statusPedido === 'PENDENTE').length,
        pedidosEmRota: lista.filter((p) => p.statusPedido === 'SAIU_PARA_ENTREGA').length,
        pedidosEntregues: lista.filter((p) => p.statusPedido === 'ENTREGUE').length,
      };
    };
    return { hoje: resumir(pedidosDeHoje), geral: resumir(pedidos) };
  }

  private chaveDoDia(data: Date) {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Maceio', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(data);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }

  atualizarStatus(id: number, statusPedido: StatusPedido) {
    return this.prisma.pedido.update({ where: { id }, data: { statusPedido } });
  }

  atualizarPagamento(id: number, statusPagamento: StatusPagamento) {
    return this.prisma.pedido.update({ where: { id }, data: { statusPagamento } });
  }

  async cancelarPorEstoque(id: number) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');

    await this.prisma.pedido.update({
      where: { id },
      data: { statusPedido: 'CANCELADO', motivoCancelamento: 'Falta de estoque' },
    });

    const estorno = pedido.formaPagamento === 'PIX'
      ? ' Se você já realizou o pagamento via Pix, faremos o estorno.'
      : '';
    const mensagem = `Olá, ${pedido.nomeCliente}. Infelizmente as sopas esgotaram e precisamos cancelar o pedido #${pedido.id}.${estorno} Pedimos desculpas e agradecemos a compreensão. — IBE Gerais`;
    return {
      whatsappUrl: `https://wa.me/${pedido.telefoneCliente.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`,
    };
  }

}

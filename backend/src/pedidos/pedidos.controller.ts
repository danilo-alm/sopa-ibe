import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AtualizarStatusPagamentoDto,
  AtualizarStatusPedidoDto,
  ComprovanteUpload,
  CriarPedidoDto,
  FiltrarPedidosDto,
} from './pedidos.dto';
import { PedidosService } from './pedidos.service';

const formatosPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('comprovante', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        callback(
          formatosPermitidos.includes(file.mimetype) ? null : new BadRequestException('Formato de comprovante inválido'),
          formatosPermitidos.includes(file.mimetype),
        );
      },
    }),
  )
  criar(@Body() dto: CriarPedidoDto, @UploadedFile() arquivo?: ComprovanteUpload) {
    return this.service.criar(dto, arquivo);
  }

  @Get('metricas')
  @UseGuards(JwtAuthGuard)
  metricas() {
    return this.service.metricas();
  }

  @Get('eventos')
  @UseGuards(JwtAuthGuard)
  eventos(@Res() response: Response) {
    response.status(200);
    response.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    response.flushHeaders();
    const inscricao = this.service.acompanharPedidos().subscribe((evento) => {
      response.write(`event: ${evento.type || 'message'}\n`);
      response.write(`data: ${JSON.stringify(evento.data)}\n\n`);
    });
    response.on('close', () => inscricao.unsubscribe());
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listar(@Query() filtro: FiltrarPedidosDto) {
    return this.service.listar(filtro.status, filtro.pagina);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarStatusPedidoDto,
  ) {
    return this.service.atualizarStatus(id, dto.statusPedido);
  }

  @Patch(':id/pagamento')
  @UseGuards(JwtAuthGuard)
  pagamento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarStatusPagamentoDto,
  ) {
    return this.service.atualizarPagamento(id, dto.statusPagamento);
  }

  @Patch(':id/cancelar-estoque')
  @UseGuards(JwtAuthGuard)
  cancelarEstoque(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelarPorEstoque(id);
  }
}

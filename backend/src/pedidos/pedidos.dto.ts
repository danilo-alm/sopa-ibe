import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO'] as const;
export const STATUS_PEDIDO = ['PENDENTE', 'CONFIRMADO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO'] as const;
export const STATUS_PAGAMENTO = ['PENDENTE', 'CONFIRMADO'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];
export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export type ComprovanteUpload = {
  mimetype: string;
  originalname: string;
  buffer: Buffer;
  size: number;
};

export class CriarPedidoDto {
  @IsString() @MinLength(2) @MaxLength(100) nomeCliente: string;
  @IsString() @MinLength(10) @MaxLength(20) telefoneCliente: string;
  @IsString() @MinLength(5) @MaxLength(250) enderecoEntrega: string;
  @IsOptional() @IsString() @MaxLength(200) pontoReferencia?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantidadeSopas: number;

  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(FORMAS_PAGAMENTO)
  formaPagamento: FormaPagamento;
}

export class AtualizarStatusPedidoDto {
  @IsIn(STATUS_PEDIDO)
  statusPedido: StatusPedido;
}

export class AtualizarStatusPagamentoDto {
  @IsIn(STATUS_PAGAMENTO)
  statusPagamento: StatusPagamento;
}

export class FiltrarPedidosDto {
  @IsOptional()
  @IsIn(STATUS_PEDIDO)
  status?: StatusPedido;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;
}

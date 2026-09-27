import { Body, Controller, Post } from '@nestjs/common';
import { IsNumber, Max, Min } from 'class-validator';
import { PixService } from './pix.service';

class GerarPixDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  valor: number;
}

@Controller('pix')
export class PixController {
  constructor(private readonly service: PixService) {}

  @Post('payload')
  gerar(@Body() dto: GerarPixDto) {
    return this.service.gerar(dto.valor);
  }
}


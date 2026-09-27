import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfiguracaoService } from './configuracao.service';

class AtualizarConfiguracaoDto {
  @IsOptional()
  @IsBoolean()
  vendasAbertas?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorUnitarioSopa?: number;

  @IsOptional()
  @IsString()
  mensagemFechado?: string;
}

@Controller('configuracao')
export class ConfiguracaoController {
  constructor(private readonly service: ConfiguracaoService) {}

  @Get('publica')
  publica() {
    return this.service.publica();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  obter() {
    return this.service.obter();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  atualizar(@Body() dto: AtualizarConfiguracaoDto) {
    return this.service.atualizar(dto);
  }
}


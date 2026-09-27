import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContatosPlantaoService } from './contatos-plantao.service';

class CriarContatoDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(10)
  numeroWhatsApp: string;
}

class AtualizarContatoDto {
  @IsOptional() @IsString() @MinLength(2) nome?: string;
  @IsOptional() @IsString() @MinLength(10) numeroWhatsApp?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

@Controller('contatos-plantao')
export class ContatosPlantaoController {
  constructor(private readonly service: ContatosPlantaoService) {}

  @Get('publicos')
  publicos() {
    return this.service.listarPublicos();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listar() {
    return this.service.listar();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  criar(@Body() dto: CriarContatoDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarContatoDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.remover(id);
  }
}


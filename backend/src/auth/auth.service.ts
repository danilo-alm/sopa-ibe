import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(email: string, senha: string) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ibegerais.org.br';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (email !== adminEmail || senha !== adminPassword) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return {
      accessToken: this.jwtService.sign({ sub: 'admin', email }),
      admin: { email },
    };
  }
}


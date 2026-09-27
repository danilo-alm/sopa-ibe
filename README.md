# Sopas IBE Gerais

Sistema mobile-first para a venda beneficente mensal de sopas da Igreja Batista Esperança. Inclui formulário público, Pix BR Code, comprovantes, contatos de plantão e painel administrativo.

O painel recebe novos pedidos imediatamente por um canal SSE autenticado, também atualiza ao retornar para a aba e mantém uma sincronização periódica como fallback, sem recarregar a página.

## Executar com Docker em produção

1. Copie `.env.example` para `.env` e troque `JWT_SECRET` e `ADMIN_PASSWORD`.
2. Inicie a aplicação:

   ```bash
   docker compose up --build -d
   ```

3. Abra:
   - Pedidos: <http://localhost:8080>
   - Administração: <http://localhost:8080/admin>

O SQLite de produção fica persistido em `./data/prod.db` e os comprovantes em `./uploads/comprovantes`. As migrations são executadas na inicialização. Se nenhuma variável for definida, as credenciais padrão são `admin@ibegerais.org.br` / `admin123`; troque-as em produção.

## Desenvolvimento com Docker

O Compose de desenvolvimento monta o código-fonte no container, usa o Vite com HMR no front e o Nest em modo `--watch` no back. As alterações locais são refletidas sem reconstruir as imagens:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Acesse:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000>

O banco de desenvolvimento usa `./data/dev.db`. Para parar os serviços, use `Ctrl+C` ou `docker compose -f docker-compose.dev.yml down`.

## Desenvolvimento local

Crie `backend/.env` a partir de `backend/.env.example`, depois execute em terminais separados:

```bash
cd backend
npm ci
touch prisma/data/dev.db
npx prisma migrate dev
npm run start:dev
```

```bash
cd frontend
npm ci
npm run dev
```

O Vite encaminha `/api` e `/uploads` para `localhost:3000`.

## Estrutura

```text
backend/
  prisma/                 schema, migration e seed
  src/auth/               login JWT e guard
  src/configuracao/       período, preço e mensagem de fechamento
  src/contatos-plantao/   CRUD de contatos
  src/pedidos/            pedidos, upload e métricas
  src/upload/             armazenamento local de comprovantes
  src/pix/                geração do payload EMV BR Code
frontend/
  src/pages/OrderPage.tsx fluxo público mobile-first
  src/pages/AdminPage.tsx dashboard responsivo
  src/components/ui/      Dialog baseado em Radix UI
```

### Nota sobre enums e SQLite

O conector SQLite do Prisma 5 não aceita `enum` no schema. Por isso, os três campos de enum do modelo de referência são persistidos como `String`, mantendo os mesmos valores e validação estrita via DTOs (`class-validator`) na API.

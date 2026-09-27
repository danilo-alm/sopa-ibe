-- CreateTable
CREATE TABLE "Configuracao" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
  "vendasAbertas" BOOLEAN NOT NULL DEFAULT false,
  "chavePix" TEXT NOT NULL DEFAULT '44.546.659/0001-13',
  "valorUnitarioSopa" REAL NOT NULL DEFAULT 15.0,
  "mensagemFechado" TEXT NOT NULL DEFAULT 'No momento não estamos aceitando pedidos. Fique atento aos nossos avisos para o próximo domingo de sopas!',
  "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContatoPlantao" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nome" TEXT NOT NULL,
  "numeroWhatsApp" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Pedido" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nomeCliente" TEXT NOT NULL,
  "telefoneCliente" TEXT NOT NULL,
  "enderecoEntrega" TEXT NOT NULL,
  "pontoReferencia" TEXT,
  "quantidadeSopas" INTEGER NOT NULL,
  "formaPagamento" TEXT NOT NULL,
  "valorTotal" REAL NOT NULL,
  "comprovantePath" TEXT,
  "statusPedido" TEXT NOT NULL DEFAULT 'PENDENTE',
  "statusPagamento" TEXT NOT NULL DEFAULT 'PENDENTE',
  "motivoCancelamento" TEXT,
  "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" DATETIME NOT NULL
);


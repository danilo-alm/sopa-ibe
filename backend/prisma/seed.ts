import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.configuracao.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  if ((await prisma.contatoPlantao.count()) === 0) {
    await prisma.contatoPlantao.create({
      data: { nome: 'Plantão IBE Gerais', numeroWhatsApp: '5531999999999' },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const fibonacci = await prisma.estimationScale.upsert({
    where: { id: 'default-fibonacci' },
    update: {},
    create: {
      id: 'default-fibonacci',
      name: 'Fibonacci',
      isDefault: true,
      values: {
        create: [
          { label: '0', numericValue: 0, sortOrder: 0 },
          { label: '1', numericValue: 1, sortOrder: 1 },
          { label: '2', numericValue: 2, sortOrder: 2 },
          { label: '3', numericValue: 3, sortOrder: 3 },
          { label: '5', numericValue: 5, sortOrder: 4 },
          { label: '8', numericValue: 8, sortOrder: 5 },
          { label: '13', numericValue: 13, sortOrder: 6 },
          { label: '21', numericValue: 21, sortOrder: 7 },
          { label: '?', numericValue: null, sortOrder: 8 },
          { label: String.fromCodePoint(0x2615), numericValue: null, sortOrder: 9 },
        ],
      },
    },
  })

  const tshirt = await prisma.estimationScale.upsert({
    where: { id: 'default-tshirt' },
    update: {},
    create: {
      id: 'default-tshirt',
      name: 'T-Shirt',
      isDefault: true,
      values: {
        create: [
          { label: 'XS', numericValue: 1, sortOrder: 0 },
          { label: 'S', numericValue: 2, sortOrder: 1 },
          { label: 'M', numericValue: 4, sortOrder: 2 },
          { label: 'L', numericValue: 8, sortOrder: 3 },
          { label: 'XL', numericValue: 16, sortOrder: 4 },
          { label: 'XXL', numericValue: 32, sortOrder: 5 },
        ],
      },
    },
  })

  const powers = await prisma.estimationScale.upsert({
    where: { id: 'default-powers' },
    update: {},
    create: {
      id: 'default-powers',
      name: 'Powers of 2',
      isDefault: true,
      values: {
        create: [
          { label: '1', numericValue: 1, sortOrder: 0 },
          { label: '2', numericValue: 2, sortOrder: 1 },
          { label: '4', numericValue: 4, sortOrder: 2 },
          { label: '8', numericValue: 8, sortOrder: 3 },
          { label: '16', numericValue: 16, sortOrder: 4 },
          { label: '32', numericValue: 32, sortOrder: 5 },
        ],
      },
    },
  })

  const sequencial = await prisma.estimationScale.upsert({
    where: { id: 'default-sequencial' },
    update: {},
    create: {
      id: 'default-sequencial',
      name: 'Sequencial',
      isDefault: true,
      values: {
        create: [
          { label: '1', numericValue: 1, sortOrder: 0 },
          { label: '2', numericValue: 2, sortOrder: 1 },
          { label: '3', numericValue: 3, sortOrder: 2 },
          { label: '4', numericValue: 4, sortOrder: 3 },
          { label: '5', numericValue: 5, sortOrder: 4 },
          { label: '6', numericValue: 6, sortOrder: 5 },
          { label: '7', numericValue: 7, sortOrder: 6 },
          { label: '8', numericValue: 8, sortOrder: 7 },
        ],
      },
    },
  })

  console.log('Seeded scales:', { fibonacci: fibonacci.id, tshirt: tshirt.id, powers: powers.id, sequencial: sequencial.id })
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

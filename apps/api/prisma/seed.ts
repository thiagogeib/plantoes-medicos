import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

const specialties = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Anestesiologia',
  'UTI Adulto',
  'UTI Neonatal',
  'Emergência',
  'Ortopedia',
  'Cardiologia',
]

async function main() {
  console.log('Iniciando seed...')

  for (const name of specialties) {
    await prisma.specialty.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`✓ ${specialties.length} especialidades criadas`)

  const adminEmail = 'admin@plantoesmedicos.com.br'
  const passwordHash = await argon2.hash('Admin@2026', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  })

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  })
  console.log(`✓ Admin criado: ${adminEmail}`)

  console.log('Seed concluído.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

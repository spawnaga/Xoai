import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('masteruser#1', 10);

  const masterUser = await prisma.user.upsert({
    where: { username: 'Masteruser' },
    update: {},
    create: {
      username: 'Masteruser',
      email: 'master@xoai.local',
      password: hashedPassword,
      firstName: 'Master',
      lastName: 'User',
      name: 'Master User',
      role: 'ADMIN',
      isSuperuser: true,
      isActive: true,
      isPharmacist: true,
      pharmacyStaff: {
        create: {
          role: 'MASTER_USER',
          permissionLevel: 0,
          canSupervise: true,
          maxTechsSupervised: 999,
          isActive: true,
        },
      },
    },
  });

  console.log('Master user created:', masterUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

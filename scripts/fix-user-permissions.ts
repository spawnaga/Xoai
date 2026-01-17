/**
 * Script to fix user permissions
 * Run with: npx tsx scripts/fix-user-permissions.ts
 */
import { PrismaClient } from '@prisma/client';

// Set DATABASE_URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://xoai_user:xoai_password@localhost:3306/xoai';
}

const prisma = new PrismaClient();

async function main() {
  // List all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isSuperuser: true,
      isDoctor: true,
      isPharmacist: true,
    },
  });

  console.log('Current users:');
  console.table(users);

  if (users.length === 0) {
    console.log('No users found. Please register a user first.');
    return;
  }

  // Update the first user to be a superuser with ADMIN role
  const firstUser = users[0];
  if (firstUser) {
    const updated = await prisma.user.update({
      where: { id: firstUser.id },
      data: {
        isSuperuser: true,
        role: 'ADMIN',
        isDoctor: true,
        isPharmacist: true,
      },
    });

    console.log(`\nUpdated user ${updated.username}:`);
    console.log(`  - isSuperuser: ${updated.isSuperuser}`);
    console.log(`  - role: ${updated.role}`);
    console.log(`  - isDoctor: ${updated.isDoctor}`);
    console.log(`  - isPharmacist: ${updated.isPharmacist}`);
    console.log('\nPlease log out and log back in for changes to take effect.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

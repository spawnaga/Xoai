/**
 * Database Seed Script
 * Creates the masteruser with full admin privileges
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create Master User with full admin access
  const masterPassword = await hash('Masteruser#1', 12);

  const masterUser = await prisma.user.upsert({
    where: { username: 'masteruser' },
    update: {
      // Update if exists
      password: masterPassword,
      isSuperuser: true,
      role: 'ADMIN',
      isActive: true,
      isDoctor: true,
      isPharmacist: true,
      isPharmacyTechnician: true,
      deaNumber: 'MU1234567',
      npiNumber: '1234567890',
      licenseNumber: 'MD123456',
      licenseType: 'MD',
      clinicName: 'Primary Care Clinic',
    },
    create: {
      username: 'masteruser',
      password: masterPassword,
      firstName: 'Master',
      lastName: 'User',
      name: 'Master User',
      role: 'ADMIN',
      isSuperuser: true,
      isActive: true,
      isDoctor: true,
      isPharmacist: true,
      isPharmacyTechnician: true,
      deaNumber: 'MU1234567',
      npiNumber: '1234567890',
      licenseNumber: 'MD123456',
      licenseType: 'MD',
      clinicName: 'Primary Care Clinic',
    },
  });

  console.log('✅ Created/Updated Master User:');
  console.log(`   Username: masteruser`);
  console.log(`   Password: Masteruser#1`);
  console.log(`   Role: ${masterUser.role}`);
  console.log(`   Superuser: ${masterUser.isSuperuser}`);
  console.log(`   DEA: ${masterUser.deaNumber}`);
  console.log(`   NPI: ${masterUser.npiNumber}`);
  console.log('');

  // Create a test patient (like Santa Clause in Asclepius)
  const testPatient = await prisma.patient.upsert({
    where: { mrn: 'TEST-001' },
    update: {},
    create: {
      mrn: 'TEST-001',
      firstName: 'Santa',
      lastName: 'Clause',
      dateOfBirth: new Date('1900-01-01'),
      gender: 'MALE',
      email: 'santa@northpole.com',
      phone: '555-XMAS',
      address: '1 North Pole Lane',
      city: 'North Pole',
      state: 'AK',
      zipCode: '99705',
      country: 'USA',
      emergencyContactName: 'Mrs. Clause',
      emergencyContactPhone: '555-XMAS-2',
      createdBy: masterUser.id,
    },
  });

  console.log('✅ Created/Updated Test Patient:');
  console.log(`   MRN: ${testPatient.mrn}`);
  console.log(`   Name: ${testPatient.firstName} ${testPatient.lastName}`);
  console.log(`   DOB: ${testPatient.dateOfBirth.toLocaleDateString()}`);
  console.log('');

  console.log('🎉 Database seeding completed!\n');
  console.log('You can now log in with:');
  console.log('   Username: masteruser');
  console.log('   Password: Masteruser#1');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

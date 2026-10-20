import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Default Departments
  const itDept = await prisma.department.upsert({
    where: { name: 'เทคโนโลยีสารสนเทศ (IT)' },
    update: {},
    create: {
      name: 'เทคโนโลยีสารสนเทศ (IT)',
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { name: 'ทรัพยากรบุคคล (HR)' },
    update: {},
    create: {
      name: 'ทรัพยากรบุคคล (HR)',
    },
  });

  console.log('✅ Departments seeded:', [itDept.name, hrDept.name]);

  // 2. Hash default password
  const defaultPassword = 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 3. Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      departmentId: itDept.id,
    },
    create: {
      username: 'admin',
      email: 'admin@ram2.internal',
      passwordHash,
      fullName: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
      departmentId: itDept.id,
    },
  });

  console.log('✅ Admin user ready: username: admin / password: ChangeMe123!');

  // 4. Create Standard User (for role-guard testing)
  const regularUser = await prisma.user.upsert({
    where: { username: 'user1' },
    update: {
      passwordHash,
      role: Role.USER,
      isActive: true,
      departmentId: hrDept.id,
    },
    create: {
      username: 'user1',
      email: 'user1@ram2.internal',
      passwordHash,
      fullName: 'Somchai Jaidee (HR Staff)',
      role: Role.USER,
      isActive: true,
      departmentId: hrDept.id,
    },
  });

  console.log('✅ Regular user ready: username: user1 / password: ChangeMe123!');

  // 5. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_SEED',
      entity: 'System',
      meta: {
        message: 'Initial database seed completed successfully',
      },
    },
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sampleBooks = [
  {
    title: 'Introduction to Algorithms',
    author: 'Cormen, Leiserson, Rivest, Stein',
    category: 'Artificial Intelligence',
    description: 'A comprehensive textbook covering a broad range of algorithms in depth.',
    tags: ['algorithms', 'data structures', 'complexity'],
  },
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    category: 'Databases',
    description: 'The big ideas behind reliable, scalable, and maintainable systems.',
    tags: ['databases', 'distributed systems', 'scalability'],
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'Other',
    description: 'A handbook of agile software craftsmanship for writing readable code.',
    tags: ['clean code', 'best practices', 'refactoring'],
  },
  {
    title: 'You Don\u2019t Know JS',
    author: 'Kyle Simpson',
    category: 'Frontend Web Development',
    description: 'A deep dive into the core mechanisms of the JavaScript language.',
    tags: ['javascript', 'frontend', 'language'],
  },
  {
    title: 'The DevOps Handbook',
    author: 'Gene Kim et al.',
    category: 'DevOps & Security',
    description: 'How to create world-class agility, reliability, and security in technology organizations.',
    tags: ['devops', 'ci/cd', 'security'],
  },
  {
    title: 'Deep Learning',
    author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
    category: 'Artificial Intelligence',
    description: 'A foundational textbook on deep learning and neural networks.',
    tags: ['deep learning', 'neural networks', 'ai'],
  },
];

async function main() {
  console.log('Seeding database...');

  // 1. Admin account
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@lib.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin1234';
  const hashed = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashed,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`Admin ready: ${adminEmail} / ${adminPassword}`);

  // 2. A demo regular user
  const userEmail = 'user@lib.com';
  await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      password: await bcrypt.hash('user1234', 10),
      role: 'USER',
      status: 'ACTIVE',
    },
  });
  console.log(`Demo user ready: ${userEmail} / user1234`);

  // 3. Sample books (skip if a book with the same title already exists)
  let created = 0;
  for (const book of sampleBooks) {
    const existing = await prisma.book.findFirst({ where: { title: book.title } });
    if (!existing) {
      await prisma.book.create({ data: book });
      created++;
    }
  }
  console.log(`Sample books created: ${created} (skipped ${sampleBooks.length - created} existing)`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

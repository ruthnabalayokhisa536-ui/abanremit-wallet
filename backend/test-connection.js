const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Successfully connected to the database!');
    
    // Try to execute a simple query
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log('Database info:', result);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

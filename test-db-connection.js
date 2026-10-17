/**
 * Simple test script to check database connection
 */

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test creating a competition
    const competition = await prisma.competition.create({
      data: {
        name: 'test-league',
        displayName: 'Test League',
        country: 'Test Country'
      }
    });
    console.log('✅ Created test competition:', competition.displayName);
    
    // Test creating a chat room
    const chatRoom = await prisma.chatRoom.create({
      data: {
        type: 'global',
        referenceId: null,
        name: 'Test Chat Room',
        description: 'Test description'
      }
    });
    console.log('✅ Created test chat room:', chatRoom.name);
    
    // Clean up
    await prisma.chatRoom.delete({ where: { id: chatRoom.id } });
    await prisma.competition.delete({ where: { id: competition.id } });
    console.log('✅ Cleaned up test data');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

/**
 * Simple seed script for competitions and chat rooms
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSimple() {
  try {
    console.log('🌱 Seeding competitions...');

    // Create competitions using raw SQL to avoid Prisma constraints
    const competitions = [
      {
        name: 'premier-league',
        displayName: 'Premier League',
        country: 'England',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/1200px-Premier_League_Logo.svg.png'
      },
      {
        name: 'la-liga',
        displayName: 'La Liga',
        country: 'Spain',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4f/LaLiga_Santander.svg/1200px-LaLiga_Santander.svg.png'
      },
      {
        name: 'bundesliga',
        displayName: 'Bundesliga',
        country: 'Germany',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Bundesliga_logo_%282017%29.svg/1200px-Bundesliga_logo_%282017%29.svg.png'
      },
      {
        name: 'serie-a',
        displayName: 'Serie A',
        country: 'Italy',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png'
      },
      {
        name: 'ligue-1',
        displayName: 'Ligue 1',
        country: 'France',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Ligue_1_Uber_Eats_logo.svg/1200px-Ligue_1_Uber_Eats_logo.svg.png'
      },
      {
        name: 'champions-league',
        displayName: 'UEFA Champions League',
        country: 'Europe',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e6/UEFA_Champions_League_logo_2.svg/1200px-UEFA_Champions_League_logo_2.svg.png'
      }
    ];

    for (const comp of competitions) {
      const id = 'comp_' + Math.random().toString(36).substr(2, 9);
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO competitions (id, name, displayName, country, logo, isActive, createdAt, updatedAt)
        VALUES (${id}, ${comp.name}, ${comp.displayName}, ${comp.country}, ${comp.logo}, 1, datetime('now'), datetime('now'))
      `;
      console.log(`✅ Created competition: ${comp.displayName}`);
    }

    // Create global chat room
    const globalId = 'room_global_' + Math.random().toString(36).substr(2, 9);
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO chat_rooms (id, type, referenceId, name, description, isActive, createdAt, updatedAt)
      VALUES (${globalId}, 'global', NULL, 'Global Football Chat', 'General football discussions, transfer rumors, banter, and community talk', 1, datetime('now'), datetime('now'))
    `;
    console.log(`✅ Created global chat room`);

    // Create competition chat rooms
    const createdCompetitions = await prisma.$queryRaw`SELECT * FROM competitions`;
    
    for (const competition of createdCompetitions) {
      const roomId = 'room_comp_' + Math.random().toString(36).substr(2, 9);
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO chat_rooms (id, type, referenceId, name, description, isActive, createdAt, updatedAt)
        VALUES (${roomId}, 'competition', ${competition.id}, ${competition.displayName + ' Room'}, ${'Discuss ' + competition.displayName + ' matches, standings, transfers, and news'}, 1, datetime('now'), datetime('now'))
      `;
      console.log(`✅ Created chat room: ${competition.displayName} Room`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSimple();

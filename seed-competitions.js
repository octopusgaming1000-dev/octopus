/**
 * Seed script for competitions and chat rooms
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCompetitionsAndChatRooms() {
  try {
    console.log('🌱 Seeding competitions and chat rooms...');

    // Create competitions
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

    const createdCompetitions = [];
    for (const comp of competitions) {
      const competition = await prisma.competition.upsert({
        where: { name: comp.name },
        update: comp,
        create: comp,
      });
      createdCompetitions.push(competition);
      console.log(`✅ Created/Updated competition: ${competition.displayName}`);
    }

    // Create global chat room
    const existingGlobalRoom = await prisma.chatRoom.findFirst({
      where: {
        type: 'global',
        referenceId: null
      }
    });

    const globalChatRoom = existingGlobalRoom || await prisma.chatRoom.create({
      data: {
        type: 'global',
        referenceId: null,
        name: 'Global Football Chat',
        description: 'General football discussions, transfer rumors, banter, and community talk'
      }
    });

    console.log(`✅ Created/Updated global chat room: ${globalChatRoom.name}`);

    // Create competition chat rooms
    for (const competition of createdCompetitions) {
      try {
        const existingCompRoom = await prisma.chatRoom.findFirst({
          where: {
            type: 'competition',
            referenceId: competition.id
          }
        });

        const chatRoom = existingCompRoom || await prisma.chatRoom.create({
          data: {
            type: 'competition',
            referenceId: competition.id,
            name: `${competition.displayName} Room`,
            description: `Discuss ${competition.displayName} matches, standings, transfers, and news`
          }
        });
        console.log(`✅ Created/Updated competition chat room: ${chatRoom.name}`);
      } catch (error) {
        console.log(`⚠️ Could not create chat room for ${competition.displayName}: ${error.message}`);
        // Continue with next competition
      }
    }

    // Update existing matches to link to competitions
    const matches = await prisma.match.findMany({
      where: {
        competitionId: null
      }
    });

    for (const match of matches) {
      let competitionName = null;
      
      // Map league names to competition names
      if (match.league.toLowerCase().includes('premier')) {
        competitionName = 'premier-league';
      } else if (match.league.toLowerCase().includes('la liga') || match.league.toLowerCase().includes('spain')) {
        competitionName = 'la-liga';
      } else if (match.league.toLowerCase().includes('bundesliga') || match.league.toLowerCase().includes('germany')) {
        competitionName = 'bundesliga';
      } else if (match.league.toLowerCase().includes('serie a') || match.league.toLowerCase().includes('italy')) {
        competitionName = 'serie-a';
      } else if (match.league.toLowerCase().includes('ligue 1') || match.league.toLowerCase().includes('france')) {
        competitionName = 'ligue-1';
      } else if (match.league.toLowerCase().includes('champions') || match.league.toLowerCase().includes('ucl')) {
        competitionName = 'champions-league';
      }

      if (competitionName) {
        const competition = createdCompetitions.find(c => c.name === competitionName);
        if (competition) {
          await prisma.match.update({
            where: { id: match.id },
            data: { competitionId: competition.id }
          });
          console.log(`🔗 Linked match ${match.homeTeam} vs ${match.awayTeam} to ${competition.displayName}`);
        }
      }
    }

    // Create match-specific chat rooms for existing matches
    const updatedMatches = await prisma.match.findMany({
      where: {
        chatRooms: {
          none: {}
        }
      }
    });

    for (const match of updatedMatches) {
      await prisma.chatRoom.create({
        data: {
          type: 'match',
          referenceId: match.id,
          name: `${match.homeTeam} vs ${match.awayTeam}`,
          description: `Match discussion for ${match.homeTeam} vs ${match.awayTeam} in ${match.league}`
        }
      });
      console.log(`💬 Created chat room for match: ${match.homeTeam} vs ${match.awayTeam}`);
    }

    console.log('\n🎉 Competitions and chat rooms seeded successfully!');
    console.log(`📊 Created ${createdCompetitions.length} competitions`);
    console.log(`💬 Created chat rooms for all competitions and matches`);
    
  } catch (error) {
    console.error('❌ Error seeding competitions and chat rooms:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedCompetitionsAndChatRooms()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedCompetitionsAndChatRooms };

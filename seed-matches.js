// Sample matches seed script
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMatches() {
  try {
    // Clear existing matches
    await prisma.match.deleteMany({});
    
    // Sample matches data
    const matches = [
      {
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        league: 'Premier League',
        kickoffTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        venue: 'Old Trafford',
        weather: 'Partly Cloudy',
        status: 'scheduled'
      },
      {
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        league: 'Premier League',
        kickoffTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        venue: 'Emirates Stadium',
        weather: 'Rainy',
        status: 'scheduled'
      },
      {
        homeTeam: 'Barcelona',
        awayTeam: 'Real Madrid',
        league: 'La Liga',
        kickoffTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
        venue: 'Camp Nou',
        weather: 'Sunny',
        status: 'scheduled'
      },
      {
        homeTeam: 'Bayern Munich',
        awayTeam: 'Borussia Dortmund',
        league: 'Bundesliga',
        kickoffTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // In 4 days
        venue: 'Allianz Arena',
        weather: 'Cloudy',
        status: 'scheduled'
      },
      {
        homeTeam: 'PSG',
        awayTeam: 'Lyon',
        league: 'Ligue 1',
        kickoffTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // In 5 days
        venue: 'Parc des Princes',
        weather: 'Wind',
        status: 'scheduled'
      }
    ];

    // Insert matches
    for (const match of matches) {
      await prisma.match.create({
        data: match
      });
    }

    console.log('✅ Sample matches seeded successfully!');
    console.log(`📊 Created ${matches.length} matches`);

  } catch (error) {
    console.error('❌ Error seeding matches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMatches();

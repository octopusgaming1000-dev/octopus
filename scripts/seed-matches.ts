import { prisma } from '../lib/prisma'

const sampleMatches = [
  {
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    league: 'Premier League',
    kickoffTime: new Date('2026-01-30T20:00:00Z'),
    venue: 'Old Trafford',
    weather: 'Cloudy, 12°C',
    status: 'scheduled'
  },
  {
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    league: 'Premier League',
    kickoffTime: new Date('2026-01-31T15:00:00Z'),
    venue: 'Emirates Stadium',
    weather: 'Rainy, 10°C',
    status: 'scheduled'
  },
  {
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    league: 'La Liga',
    kickoffTime: new Date('2026-02-01T19:00:00Z'),
    venue: 'Camp Nou',
    weather: 'Clear, 18°C',
    status: 'scheduled'
  },
  {
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    league: 'Bundesliga',
    kickoffTime: new Date('2026-02-02T17:30:00Z'),
    venue: 'Allianz Arena',
    weather: 'Snowy, -2°C',
    status: 'scheduled'
  },
  {
    homeTeam: 'Paris Saint-Germain',
    awayTeam: 'Marseille',
    league: 'Ligue 1',
    kickoffTime: new Date('2026-02-03T20:00:00Z'),
    venue: 'Parc des Princes',
    weather: 'Windy, 15°C',
    status: 'scheduled'
  }
]

async function seedMatches() {
  try {
    console.log('Seeding sample matches...')
    
    for (const match of sampleMatches) {
      await prisma.match.create({
        data: match
      })
    }
    
    console.log('Sample matches seeded successfully!')
  } catch (error) {
    console.error('Error seeding matches:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedMatches()

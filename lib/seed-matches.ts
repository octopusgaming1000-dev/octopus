import { prisma } from '@/lib/prisma'

const sampleMatches = [
  // Premier League matches
  {
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    league: 'Premier League',
    leagueApiId: '39',
    kickoffTime: new Date('2026-02-28T15:00:00Z'),
    venue: 'Old Trafford',
    weather: 'Cloudy',
    status: 'scheduled',
    source: 'fixture_api'
  },
  {
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    league: 'Premier League',
    leagueApiId: '39',
    kickoffTime: new Date('2026-02-28T17:30:00Z'),
    venue: 'Emirates Stadium',
    weather: 'Rainy',
    status: 'scheduled',
    source: 'fixture_api'
  },
  {
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham',
    league: 'Premier League',
    leagueApiId: '39',
    kickoffTime: new Date('2026-03-01T14:00:00Z'),
    venue: 'Etihad Stadium',
    weather: 'Sunny',
    status: 'scheduled',
    source: 'fixture_api'
  },
  
  // La Liga matches
  {
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    league: 'La Liga',
    leagueApiId: '140',
    kickoffTime: new Date('2026-02-28T20:00:00Z'),
    venue: 'Santiago Bernabéu',
    weather: 'Clear',
    status: 'scheduled',
    source: 'fixture_api'
  },
  {
    homeTeam: 'Atlético Madrid',
    awayTeam: 'Sevilla',
    league: 'La Liga',
    leagueApiId: '140',
    kickoffTime: new Date('2026-03-01T18:00:00Z'),
    venue: 'Metropolitano Stadium',
    weather: 'Windy',
    status: 'scheduled',
    source: 'fixture_api'
  },
  
  // Serie A matches
  {
    homeTeam: 'Juventus',
    awayTeam: 'AC Milan',
    league: 'Serie A',
    leagueApiId: '135',
    kickoffTime: new Date('2026-02-28T19:45:00Z'),
    venue: 'Allianz Stadium',
    weather: 'Cold',
    status: 'scheduled',
    source: 'fixture_api'
  },
  {
    homeTeam: 'Inter Milan',
    awayTeam: 'Napoli',
    league: 'Serie A',
    leagueApiId: '135',
    kickoffTime: new Date('2026-03-01T20:00:00Z'),
    venue: 'San Siro',
    weather: 'Foggy',
    status: 'scheduled',
    source: 'fixture_api'
  },
  
  // Bundesliga matches
  {
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    league: 'Bundesliga',
    leagueApiId: '78',
    kickoffTime: new Date('2026-02-28T17:30:00Z'),
    venue: 'Allianz Arena',
    weather: 'Snow',
    status: 'scheduled',
    source: 'fixture_api'
  },
  {
    homeTeam: 'RB Leipzig',
    awayTeam: 'Bayer Leverkusen',
    league: 'Bundesliga',
    leagueApiId: '78',
    kickoffTime: new Date('2026-03-01T15:30:00Z'),
    venue: 'Red Bull Arena',
    weather: 'Cloudy',
    status: 'scheduled',
    source: 'fixture_api'
  },
  
  // Ligue 1 matches
  {
    homeTeam: 'PSG',
    awayTeam: 'Marseille',
    league: 'Ligue 1',
    leagueApiId: '61',
    kickoffTime: new Date('2026-02-28T21:00:00Z'),
    venue: 'Parc des Princes',
    weather: 'Rainy',
    status: 'scheduled',
    source: 'fixture_api'
  },
  {
    homeTeam: 'Lyon',
    awayTeam: 'Monaco',
    league: 'Ligue 1',
    leagueApiId: '61',
    kickoffTime: new Date('2026-03-01T16:00:00Z'),
    venue: 'Groupama Stadium',
    weather: 'Sunny',
    status: 'scheduled',
    source: 'fixture_api'
  }
]

export async function seedMatches() {
  try {
    console.log('Seeding matches...')
    
    // Get competitions to link matches
    const competitions = await prisma.competition.findMany({
      where: { isActive: true },
      select: {
        id: true,
        leagueApiId: true
      }
    })
    
    const competitionMap = new Map()
    competitions.forEach(comp => {
      competitionMap.set(comp.leagueApiId, comp.id)
    })
    
    for (const match of sampleMatches) {
      const competitionId = competitionMap.get(match.leagueApiId)
      
      const existingMatch = await prisma.match.findFirst({
        where: {
          AND: [
            { homeTeam: match.homeTeam },
            { awayTeam: match.awayTeam },
            { kickoffTime: match.kickoffTime }
          ]
        }
      })

      if (!existingMatch) {
        await prisma.match.create({
          data: {
            ...match,
            competitionId: competitionId || null
          }
        })
        console.log(`Created match: ${match.homeTeam} vs ${match.awayTeam}`)
      } else {
        console.log(`Match already exists: ${match.homeTeam} vs ${match.awayTeam}`)
      }
    }

    console.log('Match seeding completed!')
    
    // Show summary
    const totalMatches = await prisma.match.count({
      where: { status: 'scheduled' }
    })
    
    console.log(`Summary: ${totalMatches} scheduled matches`)
    
  } catch (error) {
    console.error('Error seeding matches:', error)
  }
}

// Run if called directly
if (require.main === module) {
  seedMatches().then(() => process.exit(0))
}

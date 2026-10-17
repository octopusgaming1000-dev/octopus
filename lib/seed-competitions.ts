import { prisma } from '@/lib/prisma'

const sampleCompetitions = [
  {
    name: 'premier-league',
    displayName: 'Premier League',
    country: 'England',
    leagueApiId: '39',
    currentSeason: '2024-2025',
    isPopular: true,
    popularityScore: 100,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/1200px-Premier_League_Logo.svg.png'
  },
  {
    name: 'championship',
    displayName: 'Championship',
    country: 'England',
    leagueApiId: '40',
    currentSeason: '2024-2025',
    isPopular: true,
    popularityScore: 75,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/English_Football_League_Championship_logo.svg/1200px-English_Football_League_Championship_logo.svg.png'
  },
  {
    name: 'la-liga',
    displayName: 'La Liga',
    country: 'Spain',
    leagueApiId: '140',
    currentSeason: '2024-2025',
    isPopular: true,
    popularityScore: 95,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/LaLiga_EA_Sports_2023.svg/1200px-LaLiga_EA_Sports_2023.svg.png'
  },
  {
    name: 'serie-a',
    displayName: 'Serie A',
    country: 'Italy',
    leagueApiId: '135',
    currentSeason: '2024-2025',
    isPopular: true,
    popularityScore: 90,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png'
  },
  {
    name: 'bundesliga',
    displayName: 'Bundesliga',
    country: 'Germany',
    leagueApiId: '78',
    currentSeason: '2024-2025',
    isPopular: true,
    popularityScore: 85,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo.svg/1200px-Bundesliga_logo.svg.png'
  },
  {
    name: 'ligue-1',
    displayName: 'Ligue 1',
    country: 'France',
    leagueApiId: '61',
    currentSeason: '2024-2025',
    isPopular: true,
    popularityScore: 80,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Ligue_1_Uber_Eats_logo.svg/1200px-Ligue_1_Uber_Eats_logo.svg.png'
  },
  {
    name: 'primeira-liga',
    displayName: 'Primeira Liga',
    country: 'Portugal',
    leagueApiId: '94',
    currentSeason: '2024-2025',
    isPopular: false,
    popularityScore: 60,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/Liga_Portugal_Bwin_2022.svg/1200px-Liga_Portugal_Bwin_2022.svg.png'
  },
  {
    name: 'eredivisie',
    displayName: 'Eredivisie',
    country: 'Netherlands',
    leagueApiId: '88',
    currentSeason: '2024-2025',
    isPopular: false,
    popularityScore: 65,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/Eredivisie_logo.svg/1200px-Eredivisie_logo.svg.png'
  },
  {
    name: 'scottish-premiership',
    displayName: 'Scottish Premiership',
    country: 'Scotland',
    leagueApiId: '179',
    currentSeason: '2024-2025',
    isPopular: false,
    popularityScore: 55,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Scottish_Professional_Football_League_logo.svg/1200px-Scottish_Professional_Football_League_logo.svg.png'
  },
  {
    name: 'super-lig',
    displayName: 'Süper Lig',
    country: 'Turkey',
    leagueApiId: '203',
    currentSeason: '2024-2025',
    isPopular: false,
    popularityScore: 50,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/Turkish_Super_Lig_logo.svg/1200px-Turkish_Super_Lig_logo.svg.png'
  },
  {
    name: 'major-league-soccer',
    displayName: 'Major League Soccer',
    country: 'USA',
    leagueApiId: '253',
    currentSeason: '2024',
    isPopular: false,
    popularityScore: 70,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/MLS_logo.svg/1200px-MLS_logo.svg.png'
  },
  {
    name: 'brasileirao',
    displayName: 'Brasileirão',
    country: 'Brazil',
    leagueApiId: '71',
    currentSeason: '2024',
    isPopular: true,
    popularityScore: 85,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/60/Brasileir%C3%A3o_S%C3%A9rie_A_logo.svg/1200px-Brasileir%C3%A3o_S%C3%A9rie_A_logo.svg.png'
  },
  {
    name: 'liga-mx',
    displayName: 'Liga MX',
    country: 'Mexico',
    leagueApiId: '262',
    currentSeason: '2024-2025',
    isPopular: false,
    popularityScore: 60,
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cf/Liga_MX_logo.svg/1200px-Liga_MX_logo.svg.png'
  }
]

export async function seedCompetitions() {
  try {
    console.log('Seeding competitions...')
    
    for (const comp of sampleCompetitions) {
      const existing = await prisma.competition.findFirst({
        where: {
          OR: [
            { name: comp.name },
            { leagueApiId: comp.leagueApiId }
          ]
        }
      })

      if (!existing) {
        await prisma.competition.create({
          data: comp
        })
        console.log(`Created competition: ${comp.displayName}`)
      } else {
        console.log(`Competition already exists: ${comp.displayName}`)
      }
    }

    console.log('Competition seeding completed!')
    
    // Show summary
    const totalCompetitions = await prisma.competition.count()
    const popularCompetitions = await prisma.competition.count({
      where: { isPopular: true }
    })
    
    console.log(`Summary: ${totalCompetitions} total competitions, ${popularCompetitions} popular`)
    
  } catch (error) {
    console.error('Error seeding competitions:', error)
  }
}

// Run if called directly
if (require.main === module) {
  seedCompetitions().then(() => process.exit(0))
}

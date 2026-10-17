import { prisma } from '@/lib/prisma'

export async function seedAiCalibrationData() {
  try {
    console.log('Seeding AI calibration data...')
    
    const marketTypes = ['1X2', 'BTTS', 'OVER_2_5', 'CORNERS', 'CARDS']
    
    for (const marketType of marketTypes) {
      await prisma.aiMarketCalibration.upsert({
        where: { marketType },
        update: {},
        create: {
          marketType,
          totalPredictions: 0,
          correctPredictions: 0,
          calibrationFactor: 1.0,
        },
      })
    }
    
    console.log('AI calibration data seeded successfully')
  } catch (error) {
    console.error('Failed to seed AI calibration data:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedAiCalibrationData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

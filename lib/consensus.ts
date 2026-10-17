import { prisma } from './prisma'

/**
 * Update consensus data for a selection based on all booking codes
 */
export async function updateConsensus(selectionId: string) {
  // Note: consensusData model not implemented yet
  console.log('Consensus update not implemented for selection:', selectionId)
  
  // Get total number of unique booking codes analyzed
  const uniqueCodes = await prisma.bookingCode.findMany({
    select: { code: true },
  })
  const totalSubmissions = new Set(uniqueCodes.map((bc) => bc.code)).size

  console.log('Total submissions analyzed:', totalSubmissions)
}

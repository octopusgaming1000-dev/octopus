// Core types for the application

export type Bookmaker = 
  | 'sportybet'
  | 'bet9ja'
  | 'betking'
  | '1xbet'
  | 'merrybet'
  | 'naijabet'
  | 'betway'
  | 'bangbet'
  | 'livescorebet'

export interface DecodedSelection {
  fixture: {
    homeTeam: string
    awayTeam: string
    competition: string
    matchDate: string
    status?: string
  }
  market: string
  selection: string
  odds: number
  metadata?: Record<string, any>
}

export interface DecodedBookingCode {
  bookmaker: Bookmaker
  code: string
  selections: DecodedSelection[]
  metadata?: Record<string, any>
}

export interface AnalysisResult {
  impliedProbability: number
  combinedProbability?: number
  riskLevel: 'low' | 'medium' | 'high'
  probabilityRange: {
    min: number
    max: number
  }
  mathematicalAnalysis: {
    impliedProbability: number
    expectedValue?: number
    combinedProbability?: number
    baseProbability?: number
    statsScore?: number
    contextAdjustment?: number
    crowdAdjustment?: number
  }
  statisticalAnalysis?: {
    homeForm?: string
    awayForm?: string
    headToHead?: string
    trends?: string[]
  }
  contextualAnalysis?: {
    injuries?: string[]
    formations?: string
    refereeTendencies?: string
    venue?: string
  }
  explanation: string
}

export interface ConsensusSummary {
  selectionId: string
  selectionCount: number
  totalSubmissions: number
  percentage: number
  summary: string
}

export interface BookmakerDecoder {
  bookmaker: Bookmaker
  canDecode(code: string): boolean
  decode(code: string): Promise<DecodedBookingCode>
}


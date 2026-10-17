import { decoderRegistry } from '@/lib/decoder-interface'
import { SportyBetDecoder } from './sportybet'
import { Bet9jaDecoder } from './bet9ja'
import { BetKingDecoder } from './betking'

// Register Tier 1 decoders
decoderRegistry.register(new SportyBetDecoder())
decoderRegistry.register(new Bet9jaDecoder())
decoderRegistry.register(new BetKingDecoder())

// Export registry for use in API routes
export { decoderRegistry }


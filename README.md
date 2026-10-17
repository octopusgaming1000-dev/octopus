# Betting Code Analysis

A production-ready MVP web application for analyzing betting booking codes from Nigerian bookmakers.

## Features

- **Booking Code Analysis**: Paste codes from major Nigerian bookmakers and receive transparent, educational analysis
- **Multi-Bookmaker Support**: Supports SportyBet, Bet9ja, BetKing, and more
- **Probabilistic Analysis**: Mathematical, statistical, and contextual analysis with probability ranges
- **Crowd Intelligence**: AI consensus agent that detects patterns across user submissions
- **User Authentication**: Email-based authentication with verification

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based email authentication

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd betcode-intelligence
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables in your `.env` file:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"
   
   # JWT Secret
   JWT_SECRET="your-super-secret-jwt-key-here"
   
   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id-here"
   GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
   
   # SportyBet API (required for booking code analysis)
   SPORTYBET_API_URL="https://api.sportybet.com/v1"
   SPORTYBET_API_KEY="your-sportybet-api-key-here"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

### SportyBet API Integration

To enable real booking code analysis:

1. **Contact SportyBet** for API access
2. **Get API credentials** (API key and endpoint URL)
3. **Add to environment variables**:
   ```env
   SPORTYBET_API_URL="https://api.sportybet.com/v1"
   SPORTYBET_API_KEY="your-sportybet-api-key-here"
   ```
4. **Test with a real booking code** like "K8ZKPE"

**Fallback Behavior**: Without SportyBet API credentials, the system will display sample data (3 games) to demonstrate functionality. A "Sample Data" indicator will appear in the results section.

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                    # Utility functions and configurations
├── prisma/                 # Database schema and migrations
├── decoders/               # Bookmaker decoder modules
├── analysis/               # Analysis engine modules
└── api/                    # API route handlers
```

## Important Notes

- This product provides analysis and education, NOT betting advice or guaranteed predictions
- Always uses probabilistic, neutral language
- Includes appropriate disclaimers


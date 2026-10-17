import { OAuth2Client } from 'google-auth-library'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth credentials not found in environment variables')
}

export const googleOAuth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
)

export function getGoogleAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]

  return googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  })
}

export async function getGoogleUserInfo(code: string) {
  const { tokens } = await googleOAuth2Client.getToken(code)
  googleOAuth2Client.setCredentials(tokens)

  const ticket = await googleOAuth2Client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: GOOGLE_CLIENT_ID
  })

  const payload = ticket.getPayload()
  
  if (!payload) {
    throw new Error('Invalid Google token')
  }

  return {
    id: payload.sub!,
    email: payload.email!,
    name: payload.name || '',
    picture: payload.picture || '',
    verified_email: payload.email_verified || false
  }
}

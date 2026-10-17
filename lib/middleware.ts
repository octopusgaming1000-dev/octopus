import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './auth'

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

export async function authenticateRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

export function requireAuth(handler: (req: AuthenticatedRequest, user: JWTPayload) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = await authenticateRequest(req)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req as AuthenticatedRequest, user)
  }
}


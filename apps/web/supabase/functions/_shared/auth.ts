/**
 * Decode user identity from JWT payload.
 * The gateway has already verified the token — this only extracts claims.
 */
export function getUserFromJWT(req: Request): { id: string, email: string } {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Authorization header')
  }

  const token = authHeader.slice(7)
  const payloadB64 = token.split('.')[1]
  if (!payloadB64) {
    throw new Error('Malformed JWT')
  }

  const payload = JSON.parse(atob(payloadB64))
  if (!payload.sub) {
    throw new Error('JWT missing sub claim')
  }

  return { id: payload.sub, email: payload.email ?? '' }
}

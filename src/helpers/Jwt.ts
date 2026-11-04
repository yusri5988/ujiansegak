export type JwtClaims = {
  sub: string
  jti: string
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function signingKey(secret: string, usage: Array<'sign' | 'verify'>) {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.')
  }

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  )
}

export class Jwt {
  public static async sign(claims: JwtClaims, secret: string) {
    const header = encodeBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
    const payload = encodeBase64Url(encoder.encode(JSON.stringify(claims)))
    const signingInput = `${header}.${payload}`
    const key = await signingKey(secret, ['sign'])
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput))
    return `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`
  }

  public static async verify(token: string, secret: string): Promise<JwtClaims | null> {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const [encodedHeader, encodedPayload, encodedSignature] = parts
      if (!encodedHeader || !encodedPayload || !encodedSignature) return null

      const headerValue: unknown = JSON.parse(decoder.decode(decodeBase64Url(encodedHeader)))
      if (!isRecord(headerValue) || headerValue.alg !== 'HS256' || headerValue.typ !== 'JWT') return null

      const signingInput = `${encodedHeader}.${encodedPayload}`
      const key = await signingKey(secret, ['verify'])
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        decodeBase64Url(encodedSignature),
        encoder.encode(signingInput),
      )
      if (!isValid) return null

      const payloadValue: unknown = JSON.parse(decoder.decode(decodeBase64Url(encodedPayload)))
      if (!isRecord(payloadValue)) return null
      const { sub, jti, exp } = payloadValue
      if (
        typeof sub !== 'string' ||
        !/^\d+$/.test(sub) ||
        typeof jti !== 'string' ||
        jti.length < 16 ||
        typeof exp !== 'number' ||
        !Number.isSafeInteger(exp) ||
        exp <= Math.floor(Date.now() / 1000)
      ) {
        return null
      }

      return { sub, jti, exp }
    } catch {
      return null
    }
  }
}

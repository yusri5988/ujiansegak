/**
   * Helper Pengesahan & Kata Laluan menggunakan Web Crypto API (Cloudflare Worker Compatible)
   */
export class Hash {
  private static readonly secureHashIterations = 100_000

  /**
   * @deprecated Legacy seeded-password hash. New password writes use makeSecure.
   */
  public static async make(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = 'segak_salt_2026_'
    const data = encoder.encode(salt + password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /** Creates a salted PBKDF2-SHA-256 hash for new password writes. */
  public static async makeSecure(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: Hash.secureHashIterations },
      key,
      256,
    )
    return `pbkdf2-sha256$${Hash.secureHashIterations}$${Hash.toBase64Url(salt)}$${Hash.toBase64Url(new Uint8Array(derived))}`
  }

  /**
   * Pengesahan kata laluan dengan hash
   */
  public static async verify(password: string, hash: string): Promise<boolean> {
    if (hash.startsWith('pbkdf2-sha256$')) {
      const [algorithm, iterationsText, saltText, digestText, extra] = hash.split('$')
      const iterations = Number(iterationsText)
      if (
        algorithm !== 'pbkdf2-sha256' ||
        extra !== undefined ||
        !Number.isSafeInteger(iterations) ||
        iterations < 50_000 ||
        iterations > 600_000 ||
        !saltText ||
        !digestText
      ) {
        return false
      }

      try {
        const salt = Hash.fromBase64Url(saltText)
        const expected = Hash.fromBase64Url(digestText)
        if (salt.byteLength !== 16 || expected.byteLength !== 32) return false
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
        const derived = new Uint8Array(
          await crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
            key,
            expected.byteLength * 8,
          ),
        )
        return Hash.constantTimeEqual(derived, expected)
      } catch {
        return false
      }
    }

    const computed = await Hash.make(password)
    return Hash.constantTimeEqual(new TextEncoder().encode(computed), new TextEncoder().encode(hash))
  }

  private static toBase64Url(bytes: Uint8Array) {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  private static fromBase64Url(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  }

  private static constantTimeEqual(left: Uint8Array, right: Uint8Array) {
    if (left.byteLength !== right.byteLength) return false
    let difference = 0
    for (let index = 0; index < left.byteLength; index += 1) {
      difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
    }
    return difference === 0
  }

  /**
   * @deprecated Unsigned legacy token helper. Production authentication uses Jwt and persisted sessions.
   */
  public static generateToken(payload: Record<string, unknown>): string {
    const jsonStr = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })
    return btoa(jsonStr)
  }

  /**
   * @deprecated Unsigned legacy token parser. Production authentication uses Jwt and persisted sessions.
   */
  public static parseToken(token: string): { userId: number; role: string; exp: number } | null {
    try {
      const decoded = atob(token)
      const parsed = JSON.parse(decoded)
      if (parsed.exp < Date.now()) {
        return null // expired
      }
      return parsed
    } catch {
      return null
    }
  }
}

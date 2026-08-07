/**
   * Helper Pengesahan & Kata Laluan menggunakan Web Crypto API (Cloudflare Worker Compatible)
   */
export class Hash {
  /**
   * Menjana hash kata laluan menggunakan SHA-256 + Salt
   */
  public static async make(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = 'segak_salt_2026_'
    const data = encoder.encode(salt + password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Pengesahan kata laluan dengan hash
   */
  public static async verify(password: string, hash: string): Promise<boolean> {
    const computed = await Hash.make(password)
    return computed === hash
  }

  /**
   * Menjana Token Pengesahan Sesi / JWT buatan ringkas
   */
  public static generateToken(payload: Record<string, unknown>): string {
    const jsonStr = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })
    return btoa(jsonStr)
  }

  /**
   * Menyahkod Token Sesi
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

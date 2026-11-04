import { Hash } from '@/helpers/Hash'

export class PasswordService {
  public generateTemporaryPassword() {
    return crypto.randomUUID().replace(/-/g, '')
  }

  public async hash(password: string) {
    return Hash.makeSecure(password)
  }

  public async verify(password: string, storedHash: string) {
    return Hash.verify(password, storedHash)
  }

  public needsRehash(storedHash: string) {
    return /^[a-f0-9]{64}$/i.test(storedHash)
  }
}

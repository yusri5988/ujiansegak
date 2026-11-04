import { ApiException } from '@/app/Exceptions/ApiException'

export class ConflictException extends ApiException {
  constructor(message: string) {
    super(409, message)
  }
}

import { ApiException } from '@/app/Exceptions/ApiException'

export class AuthenticationException extends ApiException {
  constructor(message = 'Invalid credentials.') {
    super(401, message)
  }
}

import { ApiException } from '@/app/Exceptions/ApiException'

export class TooManyRequestsException extends ApiException {
  constructor(message = 'Had penggunaan chat telah dicapai. Cuba semula kemudian.') {
    super(429, message)
  }
}

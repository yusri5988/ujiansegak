import { ApiException } from '@/app/Exceptions/ApiException'

/**
 * Thrown by Services when a resource is not found.
 * Caught by the global error handler in `src/index.ts`.
 */
export class NotFoundException extends ApiException {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found.`)
  }
}

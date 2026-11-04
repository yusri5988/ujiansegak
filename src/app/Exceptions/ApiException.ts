import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class ApiException extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string) {
    super(status, { message })
  }

  public getResponse() {
    return Response.json({ message: this.message }, { status: this.status })
  }
}

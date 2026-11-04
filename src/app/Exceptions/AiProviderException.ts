import { ApiException } from '@/app/Exceptions/ApiException'

export class AiProviderException extends ApiException {
  constructor() {
    super(502, 'Perkhidmatan AI tidak dapat menjawab sekarang. Cuba semula sebentar lagi.')
  }
}

import { FB1 } from './b.js'
import { inject, injectable, lazy } from '../../../index.js'

@injectable()
export class FA1 {
  @inject(lazy(() =>FB1)) fb1: FB1;
}

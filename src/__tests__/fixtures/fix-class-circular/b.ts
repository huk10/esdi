import { FA1 } from './a.js'
import { inject, injectable, lazy } from '../../../index.js'

@injectable()
export class FB1 {
  @inject(lazy(() => FA1)) a: FA1;
}

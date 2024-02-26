import { injectable, inject, lazy } from '../../../index.js'
import { FA02 } from './a.js'


@injectable()
export class FB01 {
  @inject(lazy(() =>FA02)) a02: FA02;
}

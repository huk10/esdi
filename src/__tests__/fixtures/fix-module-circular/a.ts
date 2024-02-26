import { injectable, inject, lazy } from '../../../index.js'
import { FB01 } from './b.js'


@injectable()
export class FA01 {
  // B01 -> A02 与 A01 没有直接依赖，只是 a.ts 和 b.ts 出现循环依赖了
  // 修复可以不使用 lazy 的，只要使用回调函数延时的方法都可以，这里不想那么做了。建议是代码结构调整修复
  @inject(lazy(() => FB01)) fb01: FB01;
}

export class FA02 {

}

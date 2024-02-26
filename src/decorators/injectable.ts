import { Lifecycle } from '../lifecycle.js'
import { DEPENDENCIES } from '../constant.js'
import { checkAndInitContextMetadata, ContextMetadata } from '../metadata.js'

export function injectable(lifecycle = Lifecycle.transient) {
  return function(_: Function, context: ClassDecoratorContext) {
    // https://github.com/tc39/proposal-decorators/blob/master/README.md#:~:text=by%20checking%20whether%20their%20second%20argument%20is%20an%20object%20(in%20this%20proposal%2C%20always%20yes%3B%20previously%2C%20always%20no).
    if (typeof context !== 'object') {
      throw new Error("The current environment does not support the third stage decorator proposal.")
    }
    // 只支持对类使用此装饰器
    if (context.kind !== 'class') {
      throw new Error('This decorator can only be applied to class decorations.')
    }
    // https://github.com/microsoft/TypeScript/issues/53461
    if (typeof context.metadata === 'undefined' && !Symbol.metadata) {
      throw new Error(
        "Requires a Symbol.metadata polyfill. You can add `(Symbol as any).metadata ??= Symbol.for(\"Symbol.metadata\");` to your code entry."
      )
    }

    // 赋初始值
    checkAndInitContextMetadata(context);
    (<ContextMetadata><unknown>context.metadata)[DEPENDENCIES].lifecycle = lifecycle;
  }
}

import { DEPENDENCIES } from '../constant.js'
import { checkAndInitContextMetadata, ContextMetadata } from '../metadata.js'
import { isServiceIdentifier, ServiceIdentifier } from '../identifier.js'

/**
 * 支持普通字段、私有字段和 accessor 字段（https://github.com/tc39/proposal-decorators#:~:text=this%20proposal%20introduces%20a%20new%20type%20of%20class%20element%20that%20can%20be%20decorated）
 * @param {ServiceIdentifier} serviceIdentifier
 * @return {(value: undefined, context: ClassFieldDecoratorContext) => void}
 */
export function inject(serviceIdentifier: ServiceIdentifier): Function
export function inject(serviceIdentifier: ServiceIdentifier) {
  // 用于类字段的装饰器第一个参数总是 undefined
  return function(_: undefined, context: ClassFieldDecoratorContext | ClassAccessorDecoratorContext) {
    // https://github.com/tc39/proposal-decorators/blob/master/README.md#:~:text=by%20checking%20whether%20their%20second%20argument%20is%20an%20object%20(in%20this%20proposal%2C%20always%20yes%3B%20previously%2C%20always%20no).
    if (typeof context !== 'object') {
      throw new Error("The current environment does not support the third stage decorator proposal.")
    }
    // 只支持这两种类型，getter 和 setter 不支持。
    if (context.kind !== 'field' && (context as unknown as ClassAccessorDecoratorContext).kind !== 'accessor') {
      throw new Error(`This decorator kind \'${ context.kind }\' is not supported.`)
    }
    // https://github.com/microsoft/TypeScript/issues/53461
    if (typeof context.metadata === 'undefined' && !Symbol.metadata) {
      throw new Error(
        "Requires a Symbol.metadata polyfill. You can add `(Symbol as any).metadata ??= Symbol.for(\"Symbol.metadata\");` to your code entry.",
      )
    }

    // 可能是 es 模块出现循环依赖。
    if (typeof serviceIdentifier === 'undefined') {
      throw new Error(`No 'serviceIdentifier' parameter was received. Could mean a circular dependency problem. Try using \`lazy\` function.`)
    }

    if ( !isServiceIdentifier(serviceIdentifier)) {
      throw new Error(`This 'serviceIdentifier' is not an valid 'ServiceIdentifier'.`)
    }

    // 不支持对静态字段注入依赖
    if (context.static) {
      throw new Error('Injecting dependencies into static fields is not supported.')
    }

    // 赋初始值
    checkAndInitContextMetadata(context);

    // 此装饰器不可重复使用，如果重复使用会覆盖上一个装饰器。
    // js 语法限制了重名，那么这里就会在重复使用此装饰器时才能有值了。
    // 这里将上一个此装饰器设置的值过滤掉。
    const dependencies = (<ContextMetadata> <unknown> context.metadata)[DEPENDENCIES]
      .dependencies
      .filter(val => val.field !== context.name)

    // 因为需要支持 private 字段和 accessor 字段所以需要保留 set 方法。
    dependencies.push({serviceIdentifier, field: context.name, setter: context.access.set!});
    //
    (<ContextMetadata> <unknown> context.metadata)[DEPENDENCIES].dependencies = dependencies;
  }
}

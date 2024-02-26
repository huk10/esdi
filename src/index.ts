if (typeof Symbol.metadata == 'undefined') {
  throw new Error("requires a Symbol.metadata polyfill. You can add `(Symbol as any).metadata ??= Symbol.for(\"Symbol.metadata\");` to your code entry.")
}

// 依赖容器
export {container} from "./container.js"

// 装饰器
export {inject} from "./decorators/inject.js"
export {injectable} from "./decorators/injectable.js"
export {singleton} from "./decorators/singleton.js"

// 生命周期
export {Lifecycle} from "./lifecycle.js"

// 类型
export type {DependencyContainer} from "./container.js"
export type {Lazy} from "./lazy.js"
export type {TokenProvider, FactoryProvider, ValueProvider, ClassProvider} from './provider.js'
export type {ServiceProvider} from './provider.js'
export type {ServiceIdentifier} from './identifier.js'

// 辅助方法
export {lazy} from "./lazy.js"

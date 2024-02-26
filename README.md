# esdi

基于[第三阶段的装饰器提案](https://github.com/tc39/proposal-decorators)
和[第三阶段的装饰器元数据提案](https://github.com/tc39/proposal-decorator-metadata)实现的依赖注入库。

## Features

- 属性注入。
- 支持注入依赖到[私有属性](https://github.com/tc39/proposal-class-fields)。
- 支持注入依赖到被 [accessor 关键字](https://github.com/tc39/proposal-decorators#:~:text=Class%20auto%20accessors)修饰的属性。
- 支持向容器注册 `Provider` 。

## Todos

- [ ] 更友好的错误提示。
- [ ] 打印指定服务的依赖图。

## Install

```shell
todo
```

esdi 是基于下面两个处于第三阶段的提案实现的：

* [第三阶段的装饰器提案](https://github.com/tc39/proposal-decorators)
* [第三阶段的装饰器元数据提案](https://github.com/tc39/proposal-decorator-metadata)

目前 TypeScript 5.2 及以上版本和 Babel 7.23.0 及以上版本均已实现上述两个提案的功能。

esdi 实现不依赖 `reflect-metadata`。

**配合 TypeScript 使用**

- 将 TypeScript 的版本提升至 5.2 或以上。
- 将 `tsconfig.compilerOptions.experimentalDecorators` 设置为 `false`。
- 在你的代码入口添加 `Symbol.metadata` polyfill，可以使用此行代码：`Symbol.metadata ??= Symbol.for("Symbol.metadata");`。

**配合 Babel 使用**

- babel.config.js 中的 plugins 中添加  `["@babel/plugin-proposal-decorators", { "version": "2023-05" }]`。
- 在你的代码入口添加 `Symbol.metadata` polyfill，可以使用此行代码：`Symbol.metadata ??= Symbol.for("Symbol.metadata");`。

esdi 已经使用 Babel 和 TypeScript 进行过测试，一些细节可参考项目源代码。

## Usage

### 一般使用场景

```typescript
// 简单的无依赖、无必须参数的类不需要使用装饰器注释，除非需要特定的生命周期。
class Bar {}

@injectable()
class Foo {
  @inject(Bar) bar: Bar
}

// other file
const instance = container.resolve(Foo)
```

### 添加 Provider 作为类的依赖

```typescript
@injectable()
class Foo {
  @inject('count') count: number
}

// other file
// 可以使用任意字符串、symbol 或者 Token 的实例作为 token 向容器注册 Provider。
container.register('count', {useValue: 1000})

const instance = container.resolve(Foo); // instance.count === 1000   ->  true
```

### 为私有字段和自动访问器（Auto-Accessors）字段注入依赖。

<!-- 格式化和代码高亮还不支持 accessor 关键字。  -->

```
@injectable()
class Foo {
  @inject('token1') #count: number
  @inject('token2') accessor kind: string
}
```

## API

### Decorators

#### injectable

标记一个类，表示它是需要注入依赖的。它具有一个可选的 `Lifecycle` 参数，默认为 `Lifecycle.transient`。

*目前仅用于设置生命周期（未来可能修改）*。

```typescript
interface injectable {
  (lifecycle = Lifecycle.transient): (value: Function, context: ClassDecoratorContext) => void
}
```

#### singleton

标记一个类，表示它具有类似单例的生命周期。

```typescript
interface singleton {
  (): (value: Function, context: ClassDecoratorContext) => void
}
```

#### inject

用于需要向一个 class 的属性注入依赖时使用。

它可以传入一个 `ServiceIdentifier<T>` 类型的参数。

```typescript
interface inject {
  (serviceIdentifier: ServiceIdentifier<T>): (value: undefined, context: ClassAccessorDecoratorContext | ClassFieldDecoratorContext) => void
}
```

### Lifecycle

每个服务实例都有其对应的生命周期，不同生命周期有着不同的行为逻辑。支持三种生命周期类型，默认是：`transient`。

#### transient

默认的生命周期，即容器的每一次 `resolve` 都会创建一个全新的实例。

#### singleton

即单例，实例全局唯一且只会实例化一次。

#### resolution

类似 `transient`，不同之处在于一次 `resolve` 的过程中创建的实例都是唯一的。

即：A 依赖 B 和 C ，B 依赖 C, 如果 C 的生命周期是 `resolution`, 那么 B 和 A 都将引用同一个 C 的实例。

### Provider

向容器注册的服务提供者，支持四种 `Provider` 类型:

#### value provider

该 `Provider` 用于向容器提供一些 JavaScript 基础类型值（不能是 `undefined` ）。

```typescript
interface ValueProvider<T> {
  // 任何非 undefined 的值都可以使用。
  useValue: T;
}
```

#### class provider

该 provider 用于向容器提供一个类，它的生命周期需要用 `@injectable` 进行装饰才能实现，否则将是默认的 `Lifecycle.transient`
。

对于这种 `Provider` 其实为这个 class 新增了一个别名。

```typescript
interface ClassProvider<T> {
  useClass: Constructor<T>;
}
```

#### factory provider

工厂函数在每次 `resolve` 时都会调用， 工厂函数中可以直接访问当前容器，可以使用容器获取其他的服务实例。

*暂时不支持任何的生命周期类型*

```typescript
interface FactoryProvider<T> {
  useFactory: (container: Container) => T;
}
```

#### token provider

此 `Provider` 可以认为是一个别名或者重定向功能。

此 `Provider` 注册时会检查是否有构成循环依赖，如果有发现则会抛出错误。

```typescript
interface TokenProvider<T> {
  useToken: ServiceIdentifier<T>;
}
```

### Lazy

用于解决类循环依赖的问题。使用此方法后在 `resolve` 时不会真正的实例化一个类，而是为这个类创建一个 proxy 对象。
在第一次使用这个类时才会去实例化它，从而绕过循环依赖的问题。

**这也意味着如果无法获取实例时，对应的错误也会延迟到第一次使用时抛出。** 也就是可能会在意想不到的情况下报错，**请谨慎使用**

此方法也可用于解决模块循环依赖的问题。

```typescript
interface lazy<T> {
  (r: () => Constructor<T>): Lazy<T>;
}
```

### Token

在向容器注册 `Provider` 的时候，只能使用三种类型的值作为 `ServiceIdentifier`，分别是：`string` 、`symbol` 和 `Token`。

`Token` 类仅在在向容器注册 `Provider` 的时候有机会使用到。建议使用 `Symbol`。

```typescript
class Token<T> {
  constructor(private description: string) {}
}
```

### NormalToken

在向容器注册 `Provider` 的时候，只能使用三种类型的值，分别是：`string` 、`symbol` 和 `Token`。`NormalToken` 用于表示这种类型。

```typescript
type NormalToken<T> = string | symbol | Token<T>
```

### ServiceIdentifier

内部多处使用的一个类型，主要用于 `resolve` 方法的第一个参数。

```typescript
type ServiceIdentifier<T> = NormalToken<T> | Constructor<T> | Lazy<T>
```

### container

container 指的就是依赖注入容器（Dependency Injection Container）就是一个对象，它知道怎样初始化并配置对象及其依赖的所有对象。
> [Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html)

#### container.has

检查一个 `ServiceIdentifier` 是否已经注册过 `Provider` 了。

```typescript
interface has<T> {
  (serviceIdentifier: NormalToken): boolean;
}
```

#### container.register

向依赖注入容器注册一个 `Provider` ，容器在 `resolve` 时可能会使用此 `Provider` 获取服务实例。

```typescript
interface register<T> {
  (serviceIdentifier: ServiceIdentifier<T>, provider: Constructor<T> | ServiceProvider<T>): void;
}
```

#### container.resolve

传入一个 `ServiceIdentifier` 以获取其对应的实例。

*可能会抛出多种错误*

```typescript
interface resolve<T> {
  (serviceIdentifier: ServiceIdentifier<T>): T;
}
```

#### container.reset

重置容器状态，此操作会清除所有的服务实例（单例）、和所有已注册的 `Provider`。**请谨慎使用**。

```typescript
interface reset {
  (): void
}
```

## 循环依赖

使用 esdi 可能遇到的循环依赖问题分为以下几种：

### 模块循环依赖

即两个 js 文件互相依赖，可能两个类实际上并没有出现互相依赖。此种场景在使用 `@inject` 装饰器就会报错。
> No 'serviceIdentifier' parameter was received. Could mean a circular dependency problem. Try using `lazy` function.

对于此种场景建议是自行修改代码结构解决（esdi 并没有专门为这种场景添加支持，因为使用 `lazy`
方法就可以解决。不过[副作用](#lazy)比较大）。

如果实在是不方便修改代码结构。可以使用 `lazy`
方法解决，具体使用可参考此 [示例](./src/__tests__/fixtures/fix-class-circular)。

### 两个类互相依赖

对于此场景可以使用 `lazy` 方法绕过限制，不过请了解使用 `lazy` 方法会带来的 [问题](#lazy)。

具体使用可参考此 [示例](./src/__tests__/fixtures/fix-class-circular) 。

### 其他循环

esdi 在检测到循环依赖时，可能会抛出类似下方这种错误：
> Discovery of circular dependencies: A -> String(b) -> A

## 注意事项

- 如果需要被注入依赖的类**存在必传参数**（可以有默认参数）则无法获得实例，会抛出一个错误。
- 一个类它不需要注入任何依赖，那么可以省略 `@injectable` 装饰器，但是其生命周期就会是默认的 `Lifecycle.transient`。
- 提供的三个装饰器都可以重复使用，后运行的装饰器会覆盖先运行的。
- 如果提供的装饰器使用在非第三阶段装饰器环境中则会抛出一个错误。
- 如果使用了 `@inject` 但是没有使用 `@injectable` 依赖能正常注入，但是其生命周期就会是默认的 `Lifecycle.transient`。
- `ValueProvider` 支持任意非 `undefined` 类型的值。
- 不在需要 `reflect-metadata` 。

## FAQ

#### 为什么不支持构造函数参数注入依赖？

因为目前第三阶段的装饰器提案缺少参数装饰器 [decorators proposal](https://github.com/tc39/proposal-decorators#:~:text=Could%20we%20support%20decorating%20objects%2C%20parameters%2C%20blocks%2C%20functions%2C%20etc%3F)
，故不支持构造函数参数注入。

#### class provider 如何设置生命周期？

可以为相对应的 class 添加 `@injectable` 装饰器。

## License

The [MIT License](./LICENSE).

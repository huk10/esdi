# esdi

[![MIT License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://github.com/huk10/esdi/blob/master/LICENSE)
![](https://img.shields.io/badge/types-included-blue.svg)
![](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
![](https://github.com/huk10/esdi/wiki/coverage.svg)
[![Release](https://img.shields.io/github/release/huk10/esdi.svg?style=flat-square)](https://github.com/huk10/esdi/releases)

Dependency injection library implemented based on [the decorator Stage 3 proposal](https://github.com/tc39/proposal-decorators) and [the decorator metadata Stage 3 proposal](https://github.com/tc39/proposal-decorator-metadata) .

[English](./README.md) | [简体中文](./README-zh-Hans.md)

- Property injection.
- Supports injecting dependencies into [private properties](https://github.com/tc39/proposal-class-fields).
- Supports injecting dependencies into properties modified
  by [the accessor keyword](https://github.com/tc39/proposal-decorators#:~:text=Class%20auto%20accessors).
- Supports registration with containers `Provider`.

## Todos

- [ ] More friendly error prompts.
- [ ] Prints the dependency graph of the specified service.

## Install

```shell
todo
```

esdi is implemented based on the following two proposals in phase three:

* [Stage 3 Decorator Proposal](https://github.com/tc39/proposal-decorators)
* [Stage 3 Decorator Metadata Proposal](https://github.com/tc39/proposal-decorator-metadata)

Currently, TypeScript 5.2 and above and Babel 7.23.0 and above have implemented the functions of the above two
proposals.

The esdi implementation is independent `reflect-metadata`.

**Use with TypeScript**

- Upgrade the TypeScript version to 5.2 or above.
- Set `tsconfig.compilerOptions.experimentalDecorators` to `false`.
- To add polyfill to your code entry `Symbol.metadata`, you can use this line of
  code: `Symbol.metadata ??= Symbol.for("Symbol.metadata");`。

**Use with Babel**

- Added in plugins in babel.config.js `["@babel/plugin-proposal-decorators", { "version": "2023-05" }]`.
- To add polyfill to your code entry `Symbol.metadata`, you can use this line of
  code: `Symbol.metadata ??= Symbol.for("Symbol.metadata");`。

esdi has been tested using Babel and TypeScript, and some details can be found in the project source code.

## Usage

### General usage scenarios

```typescript
// Simple classes with no dependencies and no required parameters do not need to be annotated with decorators unless a specific life cycle is required.
class Bar {}

@injectable()
class Foo {
  @inject(Bar) bar: Bar
}

// other file
const instance = container.resolve(Foo)
```

### Add Provider as a dependency of the class

```typescript
@injectable()
class Foo {
  @inject('count') count: number
}

// other file
// You can use any string, symbol, or Token instance as the token to register the Provider with the container.
container.register('count', {useValue: 1000})

const instance = container.resolve(Foo); // instance.count === 1000   ->  true
```

### Inject dependencies for private fields and Auto-Accessors fields.

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

Mark a class to indicate that it requires injection of dependencies.
It has an optional `Lifecycle` argument, which defaults to `Lifecycle.transient`.

*Currently only used to set the life cycle (may be modified in the future)*.

```typescript
interface injectable {
  (lifecycle = Lifecycle.transient): (value: Function, context: ClassDecoratorContext) => void
}
```

#### singleton

Mark a class to indicate that it has a singleton-like lifecycle.

```typescript
interface singleton {
  (): (value: Function, context: ClassDecoratorContext) => void
}
```

#### inject

Used when you need to inject dependencies into attributes of a class.

It can pass in a `ServiceIdentifier<T>` parameter of type.

```typescript
interface inject {
  (serviceIdentifier: ServiceIdentifier<T>): (value: undefined, context: ClassAccessorDecoratorContext | ClassFieldDecoratorContext) => void
}
```

### Lifecycle

Each service instance has its corresponding life cycle, and different life cycles have different behavioral logic.
Three life cycle types are supported, the default is: `transient`.

#### transient

The default life cycle means that `resolve` a new instance is created every time the container is used.

#### singleton

That is, a singleton instance is globally unique and will only be instantiated once.

#### resolution

Similar `transient` , the difference is that  `resolve` the instances created in a process are unique.

That is: A depends on B and C, and B depends on C. If the life cycle of C is `resolution`, then both B and A will
reference the same instance of C.

### Provider

Service providers registered with the container support four `Provider` types:

#### value provider

The is `Provider` used to provide some JavaScript primitive type value to the container (which it cannot be `undefined`)
.

```typescript
interface ValueProvider<T> {
  // Any value other than undefined can be used.
  useValue: T;
}
```

#### class provider

This provider is used to provide a class to the container. Its life cycle needs to be `@injectable` decorated with to be
implemented, otherwise it will be the default `Lifecycle.transient`.

For this kind of `Provider` thing, an alias is actually added to this class.

```typescript
interface ClassProvider<T> {
  useClass: Constructor<T>;
}
```

#### factory provider

The factory function `resolve` will be called every time. The current container can be directly accessed in the factory
function, and the container can be used to obtain other service instances.

*No life cycle types are currently supported*

```typescript
interface FactoryProvider<T> {
  useFactory: (container: Container) => T;
}
```

#### token provider

This `Provider` can be thought of as an alias or redirect function.

When registering, `Provider` it will check whether there is a circular dependency, and if found, an error will be
thrown.

```typescript
interface TokenProvider<T> {
  useToken: ServiceIdentifier<T>;
}
```

### Lazy

Used to solve class circular dependency problems. After using this method, `resolve` a class will not actually be
instantiated, but a proxy object will be created for this class. This class will be instantiated only when it is used
for the first time, thereby bypassing the problem of circular dependencies.

**This also means that if the instance cannot be obtained, the corresponding error will be delayed until the first
use.** That is to say, an error may be reported in unexpected circumstances, **please use it with caution.**

*This method can also be used to solve the problem of module circular dependencies.*

```typescript
interface lazy<T> {
  (r: () => Constructor<T>): Lazy<T>;
}
```

### Token

When registering with the container `Provider` , only three types of values can be used `ServiceIdentifier` ,
namely: `string` 、`symbol` and `Token`.

`Token` Classes are only `Provider` used when registered with the container. Recommended `Symbol`.

```typescript
class Token<T> {
  constructor(private description: string) {}
}
```

### NormalToken

When registering with the container `Provider` , only three types of values can be used, namely: `string` 、`symbol`
and `Token`. `NormalToken` used to represent this type.

```typescript
type NormalToken<T> = string | symbol | Token<T>
```

### container

Container refers to a dependency injection container (Dependency Injection Container) which is an object that knows how
to initialize and configure the object and all the objects it depends on.
> [Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html)

#### container.has

Check `ServiceIdentifier` if a has already been registered `Provider`.

```typescript
interface has<T> {
  (serviceIdentifier: NormalToken): boolean;
}
```

#### container.register

Register one with the dependency injection container `Provider` , `resolve` which may be used by the
container `Provider` to obtain a service instance.

```typescript
interface register<T> {
  (serviceIdentifier: ServiceIdentifier<T>, provider: Constructor<T> | ServiceProvider<T>): void;
}
```

#### container.resolve

Pass in a `ServiceIdentifier` to get its corresponding instance.

*Various errors may be thrown*

```typescript
interface resolve<T> {
  (serviceIdentifier: ServiceIdentifier<T>): T;
}
```

#### container.reset

Reset the container state. This operation will clear all service instances (singletons) and all registered
ones `Provider`. **Please use with caution.**

```typescript
interface reset {
  (): void
}
```

## Circular dependency

The circular dependency problems you may encounter when using esdi are divided into the following types:

### Module circular dependency

That is, two js files depend on each other, and the two classes may not actually depend on each other. In this
scenario, `@inject` an error will be reported when using the decorator.
> No 'serviceIdentifier' parameter was received. Could mean a circular dependency problem. Try using `lazy` function.

For this scenario, it is recommended to modify the code structure by yourself (esdi has not specifically added support
for this scenario, because `lazy`
it can be solved by using the method. However, [the side effects](#lazy) are relatively large).

If it is really inconvenient to modify the code structure. This can be solved using `lazy`
the method. For specific usage, please refer to this [example](./src/__tests__/fixtures/fix-class-circular).

### Two classes depend on each other

For this scenario, you can use `lazy` the method to bypass the restriction, but please be aware
of [the problems](#lazy) `lazy` caused by using the method.

For specific usage, please refer to this [example](./src/__tests__/fixtures/fix-class-circular) .

### Other loops

When esdi detects a circular dependency, it may throw an error similar to the following:
> Discovery of circular dependencies: A -> String(b) -> A

## Precautions

- If the class that needs to be injected with dependencies **has required parameters** (it can have default parameters),
  the instance cannot be obtained and an error will be thrown.
- A class does not need to inject any dependencies, so `@injectable` the decorator can be omitted, but its life cycle
  will be default `Lifecycle.transient`.
- The three provided decorators can be reused, and the decorators that run later will overwrite the ones that run first.
- An error will be thrown if the provided decorator is used in a context other than a stage 3 decorator.
- If it is used `@inject` but not used, `@injectable` the dependency can be injected normally, but its life cycle will
  be the default `Lifecycle.transient`.
- `ValueProvider` Any value not `undefined` of type is supported.
- No longer needed `reflect-metadata` .

## FAQ

#### Why is constructor parameter injection dependency not supported?

Because the current third stage decorator proposal lacks
parameter [decorators proposal](https://github.com/tc39/proposal-decorators#:~:text=Could%20we%20support%20decorating%20objects%2C%20parameters%2C%20blocks%2C%20functions%2C%20etc%3F)
, constructor parameter injection is not supported.

#### How to set the life cycle of class provider?

`@injectable` Decorators can be added to the corresponding class .

## License

The [MIT License](./LICENSE).

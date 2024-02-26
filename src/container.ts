import { isLazy } from './lazy.js'
import { Lifecycle } from './lifecycle.js'
import { ResolutionContext } from './context.js'
import { isNormalToken, NormalToken } from './token.js'
import { getClassMetadata, ServiceMetadata } from './metadata.js'
import type {ServiceProvider, TokenProvider } from './provider.js'
import { Constructor, isConstructor, ServiceIdentifier, serviceIdentifierName } from './identifier.js'
import { isClassProvider, isFactoryProvider, isProvider, isTokenProvider, isValueProvider } from './provider.js'

/**
 * 如果依赖装饰器 context 的 addInitializer 来实现的话，不好处理循环依赖的检测。所以采用 metadata 的方式实现。
 */
export class DependencyContainer {
  // 存储用户手动注册的服务
  private registry = new Map<ServiceIdentifier, ServiceProvider>()
  // 存储所有单例服务的示例。
  private instances = new Map<ServiceIdentifier, unknown>()

  /**
   * 查询一个 ServiceIdentifier 是否有注册 provider。
   */
  has(serviceIdentifier: ServiceIdentifier): boolean {
    return !!serviceIdentifier && this.registry.has(serviceIdentifier)
  }

  /**
   * 供用户手动添加 Provider
   * - serviceIdentifier 只可以是这三种类型：string | symbol | Token<T>
   *    为了避免歧义，现象一下如果使用 A class 注册一个 provider 这时候 resolve 会是什么结果，它会覆盖掉 A class 这样
   *    就永远无法 resolve 出 A class 的实例了。
   *    我希望 provider 的 key 要避免和装饰器装饰的 class 冲突。保证内部的逻辑清晰。所以此处限制了 serviceIdentifier 只能是上述三个类型。
   * - provider 可以是支持的 4 种 provider 之一：value provider、factory provider、class provider、token provider
   *   如果是 token provider 的话会检测是否有出现循环依赖。
   * 如果 provider 是 class provider 则可以直接传递这个 class。
   * todo provider 的生命周期是否需要支持。
   */
  register(serviceIdentifier: NormalToken, provider: ServiceProvider): void
  register(serviceIdentifier: NormalToken, provider: Constructor<unknown>): void
  register(serviceIdentifier: NormalToken, provider: ServiceProvider | Constructor<unknown>): void {

    if (isConstructor(provider)) {
      provider = { useClass: provider }
    }

    // 检查下 provider 是否合法。
    // ts 的库应该是可以省略这个的。
    if (!isProvider(provider)) {
      throw new Error('This provider is not an valid provider.');
    }

    // 检查下 token provider 是否出现循环。
    // 本方法中 serviceIdentifier === provider.useToken 也是循环的一种。
    if (isTokenProvider(provider)) {
      const paths: ServiceIdentifier[] = [serviceIdentifier];
      let tokenProvider: TokenProvider<unknown> | null = provider;
      while (tokenProvider) {
        const currentToken = tokenProvider.useToken;
        if (paths.includes(currentToken)) {
          const chain = paths
            .concat(currentToken)
            .map(val => serviceIdentifierName(val))
            .join(' -> ');
          throw new Error(`Token registration cycle detected! ${chain}`);
        }
        paths.push(currentToken);
        const registration = this.registry.get(currentToken);
        if (registration && isTokenProvider(registration)) {
          tokenProvider = registration;
        } else {
          tokenProvider = null;
        }
      }
    }

    this.registry.set(serviceIdentifier, provider);
  }

  /**
   * 通过解析 ServiceIdentifier 获取对应的服务实例。支持 5 种入参类型：string | symbol | Token<T> | Constructor<T> | Lazy<T>
   */
  resolve<T>(serviceIdentifier: ServiceIdentifier<T>): T {
    return this.resolveDelegate(serviceIdentifier, new ResolutionContext())
  }

  /**
   * 重置依赖容器。此操作会清除所有已初始化的单例服务的示例，并且清除所有 registration
   */
  reset () {
    this.registry.clear()
    this.instances.clear()
  }

  private resolveDelegate<T>(serviceIdentifier: ServiceIdentifier<T>, context: ResolutionContext): T {
    const registration = <ServiceProvider<T> | undefined>this.registry.get(<NormalToken<unknown>>serviceIdentifier);

    // 1. string | symbol | Token<T> 这三类只能被注册才能使用。
    if (isNormalToken(serviceIdentifier) && !registration) {
      throw new Error(`Attempted to resolve unregistered dependency token: "${serviceIdentifierName(serviceIdentifier)}"`);
    }

    // 如果不是 normalToken 注册的 registration 会被忽略
    if (isNormalToken(serviceIdentifier) && registration) {
      return this.resolveProviderDelegate<T>(serviceIdentifier, registration, context);
    }

    // Lazy 创建一个 proxy 返回。
    if (isLazy(serviceIdentifier)) {
      // 这里创建 proxy 就认定是实例创建成功了。
      // 后续真正实例化时报错怎么处理？
      //  本次 resolve 在这里应该就已经结束了。
      //  createProxy 中的 resolve 是新的一次 resolve
      context.startResolveServiceIdentifier(serviceIdentifier);
      const instance = serviceIdentifier.createProxy(ctor => this.resolve(ctor));
      context.endResolveServiceIdentifier(serviceIdentifier, instance);
      return instance;
    }

    // Lazy 也是一个 constructor 所以这个分支要放在最后处理。
    if (isConstructor(serviceIdentifier)) {
      return this.resolveConstructorDelegate(serviceIdentifier, context);
    }

    throw new Error(`unrecognized service identifier ${serviceIdentifierName(serviceIdentifier)}`);
  }

  private throwIfCircularDependency(serviceIdentifier: ServiceIdentifier, context: ResolutionContext) {
    if (context.hasCircularDependency(serviceIdentifier)) {
      throw new Error(
        `Discovery of circular dependencies: ${context.getDependencyChain()} -> ${serviceIdentifierName(serviceIdentifier)}`
      );
    }
  }

  private resolveConstructorDelegate<T>(serviceIdentifier: Constructor<T>, context: ResolutionContext): T {
    this.throwIfCircularDependency(serviceIdentifier, context)
    context.startResolveServiceIdentifier(serviceIdentifier)

    // 如果找不到元数据，只是无法注入依赖并不会报错。
    const metadata = getClassMetadata(serviceIdentifier)

    if (metadata.lifecycle === Lifecycle.singleton) {
      if (this.instances.has(serviceIdentifier)) {
        const instance = this.instances.get(serviceIdentifier)!
        context.endResolveServiceIdentifier(serviceIdentifier, instance)
        return <T> instance
      }
    }

    if (metadata.lifecycle === Lifecycle.resolution) {
      // 能从 context 取出 instance 表示 这个类肯定是调用过 context.resolveDone 方法的，这里就不需要重复调用了。
      if (context.hasInstance(serviceIdentifier)) {
        return <T> context.getInstance(serviceIdentifier)!
      }
    }

    const instance = this.resolveConstructor(serviceIdentifier, metadata, context)

    context.endResolveServiceIdentifier(serviceIdentifier, instance)

    if (metadata.lifecycle === Lifecycle.singleton) {
      this.instances.set(serviceIdentifier, instance)
    }
    return instance
  }

  private resolveConstructor<T>(serviceIdentifier: Constructor<T>, metadata: ServiceMetadata, context: ResolutionContext): T {
    // 因为第三阶段的装饰器提案没有参数装饰器，因此如果构造函数存在必传参数就不能实例化了。
    if (serviceIdentifier.length > 0) {
      // todo 错误提示优化。
      // throw new Error(`Cannot inject property dependency '${field.toString()}' for class '${serviceIdentifier.name}'.`)
      throw new Error(
        `This class \`${serviceIdentifier.name}\` cannot be instantiated because it has the necessary construction parameters.`
      )
    }
    const instance = new serviceIdentifier()
    for (const dependence of metadata.dependencies) {
      const {serviceIdentifier, setter} = dependence;
      // 这里不能使用 = 赋值，因为这里的 field 可能是私有字段或者 accessor 修饰过的字段。需要使用 setter 赋值。
      setter.call(instance, instance, this.resolveDelegate(serviceIdentifier, context.fork()));
    }
    return instance
  }

  private resolveProviderDelegate<T>(serviceIdentifier: ServiceIdentifier<T>, provider: ServiceProvider<T>, context: ResolutionContext): T {
    this.throwIfCircularDependency(serviceIdentifier, context)
    context.startResolveServiceIdentifier(serviceIdentifier)
    const instance = this.resolveProvider(provider, context)
    context.endResolveServiceIdentifier(serviceIdentifier, instance)
    return instance
  }

  private resolveProvider<T>(provider: ServiceProvider<T>, context: ResolutionContext): T {
    if (isValueProvider<T>(provider)) {
      return provider.useValue;
    }
    if (isFactoryProvider<T>(provider)) {
      return provider.useFactory(this);
    }
    if (isClassProvider<T>(provider)) {
      // 这里的这个 class 可能是 lazy
      // 规则是 如果 class 有注册 provider 那么以注册的内容为准。所以这里需要调用 resolveDelegate 重新走流程。
      return this.resolveDelegate(provider.useClass, context.fork());
    }
    if (isTokenProvider<T>(provider)) {
      // 递归调用即可
      return this.resolveDelegate<T>(provider.useToken, context.fork());
    }
    // 正常场景是不可达的.
    throw new Error('unknown provider');
  }
}

export const container = new DependencyContainer();

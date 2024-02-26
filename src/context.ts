import { ServiceIdentifier, serviceIdentifierName } from './identifier.js'
import { isNormalToken } from './token.js'

export class ResolutionContext {
  // 依赖链，这里只是从根节点到任意依赖的链条不是完整的依赖树
  // 也会使用这里的数据来检查循环依赖
  // 不只是 class 可以是任意 ServiceIdentifier
  private dependencyChain: Array<{serviceIdentifier: ServiceIdentifier, done: boolean; kind: 'class' | 'provider'}> = []

  // 一次 resolve 过程中解析成功的服务实例
  private instances = new Map<ServiceIdentifier, unknown>();

  // 检查是否存在依赖循环问题
  hasCircularDependency(serviceIdentifier: ServiceIdentifier) {
    if (this.dependencyChain.length === 0) return false
    const kind = isNormalToken(serviceIdentifier) ? 'provider' : 'class'
    return this.dependencyChain.some(val => val.serviceIdentifier === serviceIdentifier && !val.done && val.kind === kind);
  }

  getDependencyChain() {
    return this.dependencyChain.map(val => serviceIdentifierName(val.serviceIdentifier)).join(' -> ');
  }

  // 查询本次解析过程是否指定的服务是否已经初始化过了
  hasInstance(token: ServiceIdentifier): boolean {
    return this.instances.has(token);
  }

  // 尝试获取已初始化的服务实例
  getInstance<T>(token: ServiceIdentifier<T>): T | null {
    return <T | null> this.instances.get(token) || null;
  }

  // 标记已开始解析一个服务。
  startResolveServiceIdentifier(serviceIdentifier: ServiceIdentifier) {
    const kind = isNormalToken(serviceIdentifier) ? 'provider' : 'class'
    this.dependencyChain.push({serviceIdentifier, kind, done: false})
  }

  // 标记一个服务已实例化完成。
  endResolveServiceIdentifier(serviceIdentifier: ServiceIdentifier, instance: unknown) {
    const kind = isNormalToken(serviceIdentifier) ? 'provider' : 'class'
    const result = this.dependencyChain.find(val => val.serviceIdentifier === serviceIdentifier && val.kind === kind);
    if (result) {
      result.done = true;
    } else {
      this.dependencyChain.push({serviceIdentifier, done: true, kind});
    }
    this.instances.set(serviceIdentifier, instance);
  }

  // 依赖树的分叉，通过此操作依赖树的每个节点都能知道自身的依赖链条。
  fork() {
    const context = new ResolutionContext();
    context.instances = this.instances;
    context.dependencyChain = this.dependencyChain.slice();
    return context;
  }
}

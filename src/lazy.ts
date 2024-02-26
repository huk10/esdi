import { Constructor } from './identifier.js'

export class Lazy<T> {
  private proxyMethods: ReadonlyArray<keyof ProxyHandler<any>> = [
    'apply',
    'construct',
    'defineProperty',
    'deleteProperty',
    'get',
    'getOwnPropertyDescriptor',
    'getPrototypeOf',
    'has',
    'isExtensible',
    'ownKeys',
    'preventExtensions',
    'set',
    'setPrototypeOf',
  ];

  constructor(private forwardRef: () => Constructor<T>) {}

  createProxy(resolve: (ctor: Constructor<T>) => T): T {
    let instance: T;
    let isInit = false;
    let target: object = {};
    const lazy = () => {
      if (isInit === false) {
        instance = resolve(this.forwardRef());
        isInit = true;
      }
      return instance;
    };
    const handler: ProxyHandler<object> = {};
    for (const method of this.proxyMethods) {
      handler[method] = function (...args: any[]) {
        args[0] = lazy();
        return (<any>Reflect[method])(...args);
      };
    }
    return new Proxy(target, handler) as T;
  }
}

export function lazy<T>(forwardRef: () => Constructor<T>) {
  if (typeof forwardRef != 'function') {
    throw TypeError('Need a callback method that returns the constructor.');
  }
  return new Lazy(forwardRef);
}

export function isLazy<T>(value: any): value is Lazy<T> {
  return value instanceof Lazy;
}

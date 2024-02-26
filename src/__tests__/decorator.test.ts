/// <reference types="jest" />
import { container, inject, injectable, Lifecycle, singleton } from '../index.js'

beforeEach(() => container.reset());

/**
 * 装饰器相关用例
 * 1. resolve 一个没有使用 @injectable 或 @singleton 装饰器的类
 *    - 如果没有必传参数应该可以正常解析出实例。
 *    - 如果存在必传参数则抛出错误。
 * 2. resolve 一个使用了 @inject 装饰器但是没有使用 @injectable 或 @singleton 装饰器的类
 *    - 正常解析出实例，依赖也会注入进去，但是什么周期为默认值。
 * 3. 重复使用 @injectable 、@singleton 或 @inject 装饰器。
 *    - 依照装饰器的执行顺序，后者会覆盖前者。
 * 4. @injectable 、@singleton 或者 @inject 错误的使用在其他装饰器位置。
 *    - 抛出错误
 * 5. @injectable 、@singleton 或者 @inject 在非第三阶段装饰器提案的环境使用（应该是可以支持两种模式的，但是不打算支持）
 *    - 抛出错误
 * 6. 如果使用方没有添加 Symbol.metadata polyfill (这个操作应该不由我们来做)
 *    - 抛出错误
 * 7. @inject 装饰器对 static 、private 、accessor 、public 属性使用。
 *    - 对 static 使用会抛出错误
 *    - 不支持对 get 或 set 访问器方法装饰
 *    - 支持对 private 、accessor 、public 这三种属性类型使用
 * 8. @inject 传入一个没有任何装饰器修饰的类
 *    - 如果此类没有必传参数则正常生成实例
 * 9. @inject 没传参数、或者传入一个 undefined
 *    - 报错提示可能出现循环依赖。
 * 10. @inject 传入一个非 serviceIdentifier 类型的参数
 *    - 抛出错误
 * 11. @inject 传入一个没有注册 provider 的 NormalToken
 *    - 抛出错误找不到需要注入的依赖
 * 12. @injectable 和 @singleton 生命周期符合预期。
 */

describe('decorator', () => {
  test('resolve 一个没有使用 @injectable 或 @singleton 装饰器的类', () => {
    class Foo {
      constructor(private a = '0') {}
    }
    class Bar {
      constructor(private a: string) {}
    }
    class Baz {}

    expect(container.resolve(Foo)).toBeInstanceOf(Foo)
    expect(container.resolve(Baz)).toBeInstanceOf(Baz)
    expect(() => container.resolve(Bar)).toThrow(
`This class \`Bar\` cannot be instantiated because it has the necessary construction parameters`
    )
  });
  test('resolve 一个使用了 @inject 装饰器但是没有使用 @injectable 或 @singleton 装饰器的类', () => {
    class Foo {
      @inject('a') a: number = 0
    }
    container.register('a', {useValue: 1})
    expect(container.resolve(Foo)).toBeInstanceOf(Foo)
    // 不用 @injectable 只是取不到生命周期，还是能正确注入依赖的。
    expect(container.resolve(Foo).a).toEqual(1)
  })
  test('重复使用 @injectable 、@singleton 或 @inject 装饰器。', () => {
    @singleton()
    @injectable()
    class Foo {
      @inject('a') @inject('b') c: number = 0
    }
    container.register('a', {useValue: 1})
    container.register('b', {useValue: 2})
    const instance1 = container.resolve(Foo)
    const instance2 = container.resolve(Foo)
    expect(instance1).toBeInstanceOf(Foo)
    // 被外层的装饰器覆盖了
    expect(instance1.c).toEqual(1)

    // 覆盖了变成单例了
    expect(instance1 === instance2).toBeTruthy()
  })
  test('@injectable 、@singleton 或者 @inject 错误的使用在其他装饰器位置。', () => {
    expect(() => {
      class Foo {
        // @ts-ignore
        @inject()
        get(){}
      }
    }).toThrow('This decorator kind \'method\' is not supported.')

    expect(() => {
      class Foo {
        // @ts-ignore
        @inject()
       get get(){return 1}
      }
    }).toThrow('This decorator kind \'getter\' is not supported.')

    expect(() => {
      class Foo {
        // @ts-ignore
        @injectable()
        get(){return 1}
      }
    }).toThrow('This decorator can only be applied to class decorations.')

    expect(() => {
      class Foo {
        // @ts-ignore
        @singleton()
        get(){return 1}
      }
    }).toThrow('This decorator can only be applied to class decorations.')
  })
  // 测试太麻烦了，先忽略
  // test('@injectable 、@singleton 或者 @inject 在非第三阶段装饰器提案的环境使用', () => {})
  // 测试太麻烦了，先忽略
  // 如果使用方没有添加 Symbol.metadata polyfill (这个操作应该不由我们来做)
  test('@inject 装饰器对 static 、private 、accessor 、public 属性使用。', () => {
   expect(() => {
     class Foo {
       @inject('a') static a: number
     }
   }).toThrow(`Injecting dependencies into static fields is not supported.`)

    @injectable()
    class Foo {
      @inject('a') a: number
      @inject('b') #b: number
      @inject('c') accessor c: number

      getBValue(){return this.#b}
      getCValue(){return this.c}
    }
    container.register('a', {useValue: 1})
    container.register('b', {useValue: 2})
    container.register('c', {useValue: 3})
    const instance = container.resolve(Foo)
    expect(instance).toBeInstanceOf(Foo)
    expect(instance.a).toEqual(1)
    expect(instance.getBValue()).toEqual(2)
    expect(instance.getCValue()).toEqual(3)
  })
  test('@inject 传入一个没有任何装饰器修饰的类', () => {
    class Bar {}

    @injectable()
    class Foo {
      @inject(Bar) bar: Bar
    }
    expect(container.resolve(Foo).bar).toBeInstanceOf(Bar)


    class A01 {
      constructor(private a: number) {}
    }
    @injectable()
    class A02 {
      @inject(A01) a01 : A01
    }
    expect(() => container.resolve(A02)).toThrow(
      `This class \`A01\` cannot be instantiated because it has the necessary construction parameters`
    )
  })
  test('@inject 没传参数、或者传入一个 undefined', () => {
    expect(() => {
      class A {
        // @ts-ignore
        @inject() a: number
      }
    }).toThrow(
      'No \'serviceIdentifier\' parameter was received. Could mean a circular dependency problem. Try using `lazy` function.'
    )
    expect(() => {
      class A {
        // @ts-ignore
        @inject(undefined) a: number
      }
    }).toThrow(
      'No \'serviceIdentifier\' parameter was received. Could mean a circular dependency problem. Try using `lazy` function.'
    )
  })
  test('@inject 传入一个非 serviceIdentifier 类型的参数', () => {
    expect(() => {
      class Foo {
        // @ts-ignore
        @inject([]) a :number
      }
    }).toThrow('This \'serviceIdentifier\' is not an valid \'ServiceIdentifier\'.')
  })
  test('@inject 传入一个没有注册 provider 的 NormalToken', () => {
    @injectable()
    class Foo {
      @inject('1') a: number = 2
    }
    expect(() => container.resolve(Foo)).toThrow('Attempted to resolve unregistered dependency token: "String(1)"')
  })
  describe('@injectable 和 @singleton 生命周期符合预期。', () => {
    test('@singleton', () => {
      @singleton()
      class Foo {}
      const instance1 = container.resolve(Foo)
      const instance2 = container.resolve(Foo)
      const instance3 = container.resolve(Foo)
      expect(instance1 === instance2).toBeTruthy()
      expect(instance1 === instance3).toBeTruthy()
      expect(instance2 === instance3).toBeTruthy()
    })
    test('@injectable default', () => {
      @injectable()
      class Foo {}
      const instance1 = container.resolve(Foo)
      const instance2 = container.resolve(Foo)
      const instance3 = container.resolve(Foo)
      expect(instance1 === instance2).toBeFalsy()
      expect(instance1 === instance3).toBeFalsy()
      expect(instance2 === instance3).toBeFalsy()
      expect(instance1 !== instance2 && instance1 !== instance3 && instance3 !== instance2).toBeTruthy()
    })
    test('@injectable singleton', () => {
      @injectable(Lifecycle.singleton)
      class Foo {}
      const instance1 = container.resolve(Foo)
      const instance2 = container.resolve(Foo)
      const instance3 = container.resolve(Foo)
      expect(instance1 === instance2).toBeTruthy()
      expect(instance1 === instance3).toBeTruthy()
      expect(instance2 === instance3).toBeTruthy()
    })
    test('@injectable resolution', () => {
      @injectable(Lifecycle.resolution)
      class C {}

      @injectable()
      class B {
        @inject(C) c: C
      }
      @injectable()
      class A {
        @inject(C) c: C
        @inject(B) b: B
      }
      const instance1 = container.resolve(A)
      const instance2 = container.resolve(A)
      expect(instance1 !== instance2).toBeTruthy()

      expect(instance1.c === instance1.b.c).toBeTruthy()
    })
  })
});

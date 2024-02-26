/// <reference types="jest" />
import { container, inject, injectable, lazy, singleton } from '../index.js'
import { Token } from '../token.js'

beforeEach(() => container.reset());

describe('error', () => {
  test("需要注入依赖的类存在必传参数", () => {
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

  test('模块发生循环依赖或 @inject 没传参数、或者传入一个 undefined', () => {
    expect(() => {
      class A {
        // @ts-ignore
        @inject() a: number
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

  test('@injectable 、@singleton 或 @inject 错误的装饰在其他位置', () => {
    expect(() => {
      class Foo {
        // @ts-ignore
        @injectable()
        show(){}
      }
    }).toThrow('This decorator can only be applied to class decorations.')

    expect(() => {
      class Foo {
        // @ts-ignore
        @singleton() a:number
      }
    }).toThrow('This decorator can only be applied to class decorations.')

    expect(() => {
      class Foo {
        // @ts-ignore
        @inject() get a(){return 100}
      }
    }).toThrow('This decorator kind \'getter\' is not supported.')
  })

  test('@inject 用在了 static 属性上', () => {
    expect(() => {
      class Foo {
        @inject('a') static a: number
      }
    }).toThrow(`Injecting dependencies into static fields is not supported.`)
  })

  test('注册 TokenProvider 出现循环依赖', () => {
    const a = 'a'
    const b = new Token('b')
    const c = Symbol('c')
    container.register(a, {useToken: b})
    container.register(b, {useToken: c})
    expect(() => container.register(c, {useToken: a})).toThrow(
      `Token registration cycle detected! Symbol(c) -> String(a) -> Token(b) -> Symbol(c)`
    )
  })
  test('循环依赖：A -> B -> A', () => {
    @injectable()
    class A {
      @inject('b') b: string = ''
    }
    container.register('b', A)

    expect(() => container.resolve(A)).toThrow(
      `Discovery of circular dependencies: A -> String(b) -> A`
    )
  })

  test('注册错误的 Provider', () => {
    expect(() => container.register('undefined', {useValue: undefined}))
      .toThrow(`This provider is not an valid provider.`)
  })

  test('lazy 方法参数传错', () => {
    expect(() => {
      class Foo {
        // @ts-ignore
        @inject(lazy()) bar: Bar
      }
    })
      .toThrow(`Need a callback method that returns the constructor.`)

    class Bar {}
    @injectable()
    class Foo {
      // ！！使用不但会在第一次访问属性时抛出错误。
      // @ts-ignore
      @inject(lazy(Bar)) bar: Bar
    }
    const instance = container.resolve(Foo)
    expect(() => instance.bar instanceof Bar)
      .toThrow(`Class constructor Bar cannot be invoked without 'new'`)
  })

  test('lazy 真正实例化时可能报错', () => {
    class Bar {
      constructor(private a: number) {}
    }
    @injectable()
    class Foo {
      @inject(lazy(() => Bar)) bar: Bar
    }
    expect(container.resolve(Foo)).toBeInstanceOf(Foo)
    expect(() => container.resolve(Foo).bar instanceof Bar).toThrow(
      'This class `Bar` cannot be instantiated because it has the necessary construction parameters.'
    )
  })
})

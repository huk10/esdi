/// <reference types="jest" />
import { Token } from '../token.js'
import { container, inject, injectable } from '../index.js'
import { FA1 } from './fixtures/fix-class-circular/a.js'
import { FB1 } from './fixtures/fix-class-circular/b.js'
import { FA01 } from './fixtures/fix-module-circular/a.js'
import { FB01 } from './fixtures/fix-module-circular/b.js'

beforeEach(() => container.reset());

/**
 * 正常使用case
 * 1. 嵌套依赖：A -> B -> C
 *    - 正常支持
 * 2. 循环依赖：A -> B -> A
 *    - 如果未使用 lazy 方法则抛出错误。
 * 3. 重复依赖：A -> B、C ，B -> C
 *    - 正常支持
 *    - 如果 C 类的生命周期是 Lifecycle.resolution 则 A.c === B.c
 */

describe('Ordinary scene', () => {
  test('嵌套依赖：A -> B -> C', () => {
    class C {}
    @injectable()
    class B {
      @inject(C) c: C
    }
    @injectable()
    class A {
      @inject(B) b: B;
    }
    const instance = container.resolve(A)
    expect(instance).toBeInstanceOf(A);
    expect(instance.b).toBeInstanceOf(B);
    expect(instance.b.c).toBeInstanceOf(C);
  });
  test('模块循环依赖：A -> B -> A', () => {
    // 目前错误检测在 @inject 装饰器中，这里不好构建错误环境。
    // 只测试修复方案
    /**
     * // A file
     * @injectable()
     * class A01 {
     *   @inject(B01) b01: B01;
     * }
     * class A02 {}
     * // b file
     * class B01 {
     *   // 这里 A02 会因为模块循环依赖的问题导致值为 undefined
     *   @inject(A02) a02: A02;
     * }
     */
    // 这里用给 @inject 传参 undefined 模拟一下
    expect(() => {
      class C {
        // @ts-ignore
        @inject(undefined) a: string;
      }
    }).toThrow(
      `No 'serviceIdentifier' parameter was received. Could mean a circular dependency problem. Try using \`lazy\` function.`
    )
    // fix
    const instance = container.resolve(FA01)
    expect(instance).toBeInstanceOf(FA01)
    expect(instance.fb01).toBeInstanceOf(FB01)
  })
  test('类循环依赖：A -> B -> A', () => {
    // 直接循环依赖的话，同时也会触发模块循环依赖的检测。
    // 没有单独解决模块循环依赖的打算，这里就只测试修复后的结果了
    const instance = container.resolve(FA1)
    expect(instance).toBeInstanceOf(FA1)
    expect(instance.fb1).toBeInstanceOf(FB1)
  })
  test('Provider 循环依赖：A -> B -> A', () => {
    const a = new Token('a')
    const b = new Token('b')
    const c = new Token('c')
    container.register(a, {useToken: b})
    container.register(b, {useToken: c})
    expect(() => container.register(c, {useToken: a})).toThrow(
      `Token registration cycle detected! Token(c) -> Token(a) -> Token(b) -> Token(c)`
    )
  })
  test('类和 Provider 循环依赖：A -> B -> A', () => {
    @injectable()
    class A {
      @inject('b') b: string = ''
    }
    container.register('b', A)

    expect(() => container.resolve(A)).toThrow(`Discovery of circular dependencies: A -> String(b) -> A`)
  })
  test('重复依赖：A -> B、C ，B -> C', () => {
    class C {}
    @injectable()
    class B {@inject(C) c: C}
    @injectable()
    class A {
      @inject(B) b: B
      @inject(C) c: C
    }
    const instance = container.resolve(A)
    expect(instance).toBeInstanceOf(A)
    expect(instance.b).toBeInstanceOf(B)
    expect(instance.c).toBeInstanceOf(C)
    expect(instance.b.c).toBeInstanceOf(C)
    // 这里简单测下生命周期，其他的什么周期在其他测试文件中测。
    expect(instance.b.c !== instance.c).toBeTruthy()
  })
});

/// <reference types="jest" />
import { container, injectable } from '../index.js'

beforeEach(() => container.reset());

/**
 * provider 用例
 * 1. value provider 支持任意非 undefined 类型的值
 * 2. class provider 逻辑与 普通类的解析逻辑一致。
 * 3. factory provider 每次 resolve 都会调用一次。
 * 4. token provider 本质就是重定向。
 */

describe('provider', () => {
  test('value provider', () => {
    const cases = [
      ['string', '1'],
      ['number', 0],
      ['object', {}],
      ['array', []],
      ['symbol', Symbol()],
      ['map', new Map()],
      ['null', null],
    ]
    for (let [key, value] of cases) {
      container.register(key, {useValue: value})
    }
    for (let [key, value] of cases) {
      expect(container.resolve(key)).toStrictEqual(value)
    }
    expect(() => container.register('undefined', {useValue: undefined}))
      .toThrow(`This provider is not an valid provider.`)
  });

  test('class provider', () => {
    @injectable()
    class Foo {}
    container.register('foo', Foo)
    expect(container.resolve(Foo)).toBeInstanceOf(Foo)
    expect(container.resolve('foo')).toBeInstanceOf(Foo)
  })

  test('factory provider', () => {
    let count = 0;
    container.register('foo', {
      useFactory: () => ++count
    })
    expect(container.resolve('foo')).toEqual(1)
    expect(container.resolve('foo')).toEqual(2)
    expect(container.resolve('foo')).toEqual(3)
    expect(container.resolve('foo')).toEqual(4)
  })

  test('token provider', () => {
    // 循环依赖在index.test.ts已经测了
    // 这里只测试正常场景
    class Foo {}
    container.register('a', {useToken: 'b'})
    container.register('b', Foo)
    expect(container.resolve('a')).toBeInstanceOf(Foo)
  })
});

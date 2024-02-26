/// <reference types="jest" />
import { container, injectable, singleton } from '../index.js'

beforeEach(() => container.reset());

describe('DependencyContainer api', () => {
  test('has', () => {
    @injectable()
    class Foo {}
    expect(container.has(Foo)).toBeFalsy()
    expect(container.has('token')).toBeFalsy()
    container.register('token', Foo)
    expect(container.has('token')).toBeTruthy()
    expect(container.has(Foo)).toBeFalsy()
  })
  test('reset', () => {
    @singleton()
    class Foo {}
    container.register('token', {useValue: 1})

    const instance1 = container.resolve(Foo)
    expect(container.has('token')).toBeTruthy()

    container.reset()
    const instance2 = container.resolve(Foo)
    expect(container.has('token')).toBeFalsy()
    expect(instance1 === instance2).toBeFalsy()
  })
})

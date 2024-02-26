import { Constructor } from './identifier.js'
import { DependencyContainer } from './container.js'
import { isNormalToken, NormalToken } from './token.js'

export interface ClassProvider<T> {
  useClass: Constructor<T>;
}

export interface ValueProvider<T> {
  useValue: T;
}

export interface TokenProvider<T> {
  useToken: NormalToken<T>;
}

export interface FactoryProvider<T> {
  useFactory: (container: DependencyContainer) => T;
}

export type ServiceProvider<T = unknown> = ClassProvider<T> | ValueProvider<T> | FactoryProvider<T> | TokenProvider<T>;

export function isClassProvider<T>(value: any): value is ClassProvider<T> {
  return value && typeof value.useClass === 'function';
}

export function isValueProvider<T>(value: any): value is ValueProvider<T> {
  return value && value.useValue !== undefined;
}

export function isTokenProvider<T>(value: any): value is TokenProvider<T> {
  return value && value.useToken && isNormalToken(value.useToken);
}

export function isFactoryProvider<T>(value: any): value is FactoryProvider<T> {
  return value && typeof value.useFactory === 'function';
}

export function isProvider<T>(value: any): value is ServiceProvider<T> {
  return isValueProvider(value) || isClassProvider(value) || isFactoryProvider(value) || isTokenProvider(value);
}


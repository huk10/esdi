import { Lazy } from './lazy.js'
import { isNormalToken, NormalToken, Token } from './token.js'

export type Constructor<T> = new (...args: any) => T;

export type ServiceIdentifier<T = unknown> = NormalToken<T> | Constructor<T> | Lazy<T>;

export function isConstructor<T>(value: any): value is Constructor<T> {
  return typeof value === 'function';
}

export function isServiceIdentifier<T>(value: any): value is ServiceIdentifier<T> {
  return isNormalToken(value) || isConstructor(value) || value instanceof Lazy;
}

export function serviceIdentifierName(serviceIdentifier: ServiceIdentifier): string {
  if (serviceIdentifier instanceof Token) {
    return `Token(${serviceIdentifier.toString()})`;
  }
  // lazy 不会进入到这个方法。
  if (isConstructor(serviceIdentifier)) {
    return serviceIdentifier.name
  }
  if (typeof serviceIdentifier === 'string') {
    return `String(${serviceIdentifier})`;
  }
  return serviceIdentifier.toString();
}


// @ts-ignore 这里这个泛型类型此类本身没有使用，但是这个参数可以用来和其他的泛型参数关联。
export class Token<T = unknown> {
  constructor(private description: string) {}

  // 仅用于打印错误。
  toString() {
    return `${this.description}`;
  }
}

export type NormalToken<T = unknown> = Token<T> | string | symbol;

export function isNormalToken<T>(value: any): value is Token<T> {
  return value instanceof Token || ['string', 'symbol'].includes(typeof value);
}

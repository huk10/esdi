// 以下所有生命周期都只能在 class 和 class provider 上使用。
export enum Lifecycle {
  // 单例-全局单例。无论在哪个容器 resolve 都只会获取一个唯一实例。
  singleton = 'singleton',
  // 每次 resolve 都会实例化一个新的实例。
  transient = 'transient',
  // 一次解析过程中的共同依赖的实例为单例如：A 依赖 B 和 C ，B 依赖 C, 那么如果 C 的 scope 是 resolution, B 和 A 都将引用同一个实例。
  resolution = 'resolution',
}
